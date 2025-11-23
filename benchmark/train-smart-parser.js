#!/usr/bin/env node

/**
 * Smart Parser Training Script
 *
 * Analizza i benchmark raccolti e genera un albero decisionale ottimizzato
 * per SmartPDFParser basato sui dati reali di performance.
 */

const fs = require('fs');
const path = require('path');

console.log('=== Smart Parser Training ===\n');

// Carica i benchmark
const benchmarkFile = './smart-parser-benchmarks.json';
if (!fs.existsSync(benchmarkFile)) {
	console.error('❌ File not found:', benchmarkFile);
	process.exit(1);
}

console.log('📊 Loading benchmarks...');
const benchmarks = JSON.parse(fs.readFileSync(benchmarkFile, 'utf8'));
console.log(`✓ Loaded ${benchmarks.length.toLocaleString()} benchmark records\n`);

/**
 * Normalizza i nomi dei metodi
 */
function normalizeMethodName(method) {
	if (method.startsWith('batch-')) return 'batch';
	return method;
}

/**
 * Analizza i benchmark per categoria di dimensione PDF
 */
function analyzeBenchmarksBySize() {
	console.log('📈 Analyzing benchmarks by PDF size...\n');

	// Definisci le categorie
	const categories = [
		{ name: 'Tiny', label: 'Tiny (1-10 pages)', min: 0, max: 10 },
		{ name: 'Small', label: 'Small (11-50 pages)', min: 11, max: 50 },
		{ name: 'Medium', label: 'Medium (51-200 pages)', min: 51, max: 200 },
		{ name: 'Large', label: 'Large (201-500 pages)', min: 201, max: 500 },
		{ name: 'XLarge', label: 'X-Large (501-1000 pages)', min: 501, max: 1000 },
		{ name: 'Huge', label: 'Huge (1000+ pages)', min: 1001, max: Infinity }
	];

	const results = {};

	for (const category of categories) {
		// Filtra benchmark per questa categoria
		const inCategory = benchmarks.filter(b =>
			b.pages >= category.min &&
			b.pages <= category.max &&
			b.success === true
		);

		if (inCategory.length === 0) {
			results[category.name] = {
				label: category.label,
				samples: 0,
				message: 'No data available'
			};
			continue;
		}

		// Raggruppa per metodo
		const byMethod = {};
		inCategory.forEach(b => {
			const method = normalizeMethodName(b.method);
			if (!byMethod[method]) {
				byMethod[method] = [];
			}
			byMethod[method].push(b.duration);
		});

		// Calcola statistiche per metodo
		const methodStats = {};
		for (const [method, durations] of Object.entries(byMethod)) {
			const sorted = [...durations].sort((a, b) => a - b);
			const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
			const median = sorted[Math.floor(sorted.length / 2)];
			const min = Math.min(...durations);
			const max = Math.max(...durations);
			const p95 = sorted[Math.floor(sorted.length * 0.95)];

			methodStats[method] = {
				count: durations.length,
				avg: avg,
				median: median,
				min: min,
				max: max,
				p95: p95,
				stdDev: Math.sqrt(
					durations.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / durations.length
				)
			};
		}

		// Trova il metodo migliore (basato su mediana per robustezza)
		// Per PDF enormi, considera sia workers che processes come equivalenti
		let bestMethod = null;
		let bestMedian = Infinity;
		for (const [method, stats] of Object.entries(methodStats)) {
			if (stats.count >= 10 && stats.median < bestMedian) {
				bestMedian = stats.median;
				bestMethod = method;
			}
		}

		// Se il migliore è processes ma workers è simile (entro 10%), preferisci workers (più stabile)
		if (bestMethod === 'processes' && methodStats['workers'] && methodStats['workers'].count >= 10) {
			const workersDiff = ((methodStats['workers'].median - bestMedian) / bestMedian) * 100;
			if (workersDiff < 10) {
				console.log(`  Note: Workers is within 10% of processes (${workersDiff.toFixed(1)}% difference)`);
			}
		}

		// Trova alternative valide (entro 10% del migliore)
		const alternatives = [];
		if (bestMethod) {
			for (const [method, stats] of Object.entries(methodStats)) {
				if (method !== bestMethod && stats.count >= 10) {
					const diff = ((stats.median - bestMedian) / bestMedian) * 100;
					if (diff < 10) {
						alternatives.push({ method, diff: diff.toFixed(1) });
					}
				}
			}
		}

		results[category.name] = {
			label: category.label,
			range: `${category.min}-${category.max === Infinity ? '∞' : category.max} pages`,
			samples: inCategory.length,
			recommended: bestMethod,
			recommendedStats: bestMethod ? methodStats[bestMethod] : null,
			alternatives: alternatives,
			allMethods: methodStats
		};

		// Stampa risultati
		console.log(`${'='.repeat(70)}`);
		console.log(`📊 ${category.label}`);
		console.log(`${'='.repeat(70)}`);
		console.log(`Samples: ${inCategory.length.toLocaleString()}`);
		console.log(`Page range: ${category.min}-${category.max === Infinity ? '∞' : category.max}`);

		if (bestMethod) {
			const stats = methodStats[bestMethod];
			console.log(`\n✓ BEST METHOD: ${bestMethod.toUpperCase()}`);
			console.log(`  Median: ${stats.median.toFixed(2)}ms`);
			console.log(`  Average: ${stats.avg.toFixed(2)}ms ± ${stats.stdDev.toFixed(2)}ms`);
			console.log(`  Range: ${stats.min.toFixed(2)}ms - ${stats.max.toFixed(2)}ms`);
			console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
			console.log(`  Samples: ${stats.count}`);

			if (alternatives.length > 0) {
				console.log(`\n  Alternatives (within 10%):`);
				alternatives.forEach(alt => {
					console.log(`    - ${alt.method} (+${alt.diff}% slower)`);
				});
			}
		}

		console.log(`\nAll methods performance:`);
		const sortedMethods = Object.entries(methodStats)
			.sort((a, b) => a[1].median - b[1].median);

		sortedMethods.forEach(([method, stats], index) => {
			const marker = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
			console.log(`  ${marker} ${method.padEnd(12)} - Median: ${stats.median.toFixed(2).padStart(8)}ms  (${stats.count} samples)`);
		});
		console.log();
	}

	return results;
}

/**
 * Analizza l'impatto della complessità
 */
function analyzeByComplexity() {
	console.log('\n📊 Analyzing by complexity...\n');

	const complexities = ['simple', 'medium', 'complex'];
	const results = {};

	for (const complexity of complexities) {
		const inComplexity = benchmarks.filter(b =>
			b.complexity === complexity && b.success === true
		);

		if (inComplexity.length === 0) continue;

		const byMethod = {};
		inComplexity.forEach(b => {
			const method = normalizeMethodName(b.method);
			if (!byMethod[method]) byMethod[method] = [];
			byMethod[method].push(b.duration);
		});

		const methodStats = {};
		for (const [method, durations] of Object.entries(byMethod)) {
			methodStats[method] = {
				count: durations.length,
				median: [...durations].sort((a, b) => a - b)[Math.floor(durations.length / 2)]
			};
		}

		const best = Object.entries(methodStats)
			.filter(([_, stats]) => stats.count >= 10)
			.sort((a, b) => a[1].median - b[1].median)[0];

		results[complexity] = {
			samples: inComplexity.length,
			best: best ? best[0] : null,
			bestMedian: best ? best[1].median : null
		};

		console.log(`${complexity.toUpperCase().padEnd(10)} (${inComplexity.length} samples) → Best: ${best ? best[0] : 'N/A'} (${best ? best[1].median.toFixed(2) : 'N/A'}ms)`);
	}

	return results;
}

/**
 * Analizza l'impatto del numero di CPU cores
 */
function analyzeByCPUCores() {
	console.log('\n🖥️  Analyzing by CPU cores...\n');

	// Raggruppa per numero di core
	const coreGroups = {};
	benchmarks.forEach(b => {
		if (!b.success || !b.cpuCores) return;

		const cores = b.cpuCores;
		if (!coreGroups[cores]) {
			coreGroups[cores] = [];
		}
		coreGroups[cores].push(b);
	});

	const results = {};

	for (const [cores, samples] of Object.entries(coreGroups).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
		const byMethod = {};
		samples.forEach(b => {
			const method = normalizeMethodName(b.method);
			if (!byMethod[method]) byMethod[method] = [];
			byMethod[method].push(b.duration);
		});

		const methodStats = {};
		for (const [method, durations] of Object.entries(byMethod)) {
			if (durations.length < 5) continue; // Troppo pochi campioni
			methodStats[method] = {
				count: durations.length,
				median: [...durations].sort((a, b) => a - b)[Math.floor(durations.length / 2)]
			};
		}

		const best = Object.entries(methodStats)
			.sort((a, b) => a[1].median - b[1].median)[0];

		results[cores] = {
			samples: samples.length,
			best: best ? best[0] : null,
			bestMedian: best ? best[1].median : null,
			methodStats
		};

		console.log(`${cores.toString().padEnd(3)} cores (${samples.length.toString().padStart(4)} samples) → Best: ${best ? best[0].padEnd(10) : 'N/A'.padEnd(10)} (${best ? best[1].median.toFixed(2) : 'N/A'}ms)`);
	}

	// Calcola il rapporto di scaling
	console.log('\n📊 CPU Scaling Analysis:');
	const coresList = Object.keys(results).map(Number).sort((a, b) => a - b);

	if (coresList.length >= 2) {
		const baseline = results[coresList[0]];
		console.log(`\nBaseline: ${coresList[0]} cores`);

		for (let i = 1; i < coresList.length; i++) {
			const cores = coresList[i];
			const data = results[cores];

			if (baseline.best === data.best && baseline.bestMedian && data.bestMedian) {
				const speedup = baseline.bestMedian / data.bestMedian;
				const efficiency = (speedup / (cores / coresList[0])) * 100;
				console.log(`  ${cores} cores: ${speedup.toFixed(2)}x speedup (${efficiency.toFixed(1)}% efficiency)`);
			}
		}
	}

	return results;
}

/**
 * Genera le regole decisionali ottimizzate
 */
function generateDecisionRules(sizeAnalysis, cpuAnalysis) {
	console.log('\n🎯 Generating decision rules...\n');

	// Trova la CPU baseline dai benchmark (la più comune)
	const cpuCounts = {};
	benchmarks.forEach(b => {
		if (b.cpuCores) {
			cpuCounts[b.cpuCores] = (cpuCounts[b.cpuCores] || 0) + 1;
		}
	});
	const baselineCPU = parseInt(Object.entries(cpuCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 24);
	console.log(`📊 Baseline CPU: ${baselineCPU} cores (most common in benchmarks)`);
	console.log(`   This will be used to normalize thresholds for other CPUs\n`);

	const rules = [];

	// Regola per Tiny PDFs
	if (sizeAnalysis.Tiny && sizeAnalysis.Tiny.recommended) {
		rules.push({
			condition: 'pages <= 10',
			method: sizeAnalysis.Tiny.recommended,
			reason: `Best for tiny PDFs (median: ${sizeAnalysis.Tiny.recommendedStats.median.toFixed(2)}ms)`,
			config: getConfigForMethod(sizeAnalysis.Tiny.recommended, 'tiny')
		});
	}

	// Regola per Small PDFs
	if (sizeAnalysis.Small && sizeAnalysis.Small.recommended) {
		rules.push({
			condition: 'pages > 10 && pages <= 50',
			method: sizeAnalysis.Small.recommended,
			reason: `Best for small PDFs (median: ${sizeAnalysis.Small.recommendedStats.median.toFixed(2)}ms)`,
			config: getConfigForMethod(sizeAnalysis.Small.recommended, 'small')
		});
	}

	// Regola per Medium PDFs
	if (sizeAnalysis.Medium && sizeAnalysis.Medium.recommended) {
		rules.push({
			condition: 'pages > 50 && pages <= 200',
			method: sizeAnalysis.Medium.recommended,
			reason: `Best for medium PDFs (median: ${sizeAnalysis.Medium.recommendedStats.median.toFixed(2)}ms)`,
			config: getConfigForMethod(sizeAnalysis.Medium.recommended, 'medium')
		});
	}

	// Regola per Large PDFs
	if (sizeAnalysis.Large && sizeAnalysis.Large.recommended) {
		rules.push({
			condition: 'pages > 200 && pages <= 500',
			method: sizeAnalysis.Large.recommended,
			reason: `Best for large PDFs (median: ${sizeAnalysis.Large.recommendedStats.median.toFixed(2)}ms)`,
			config: getConfigForMethod(sizeAnalysis.Large.recommended, 'large')
		});
	}

	// Regola per XLarge PDFs
	if (sizeAnalysis.XLarge && sizeAnalysis.XLarge.recommended) {
		rules.push({
			condition: 'pages > 500 && pages <= 1000',
			method: sizeAnalysis.XLarge.recommended,
			reason: `Best for x-large PDFs (median: ${sizeAnalysis.XLarge.recommendedStats.median.toFixed(2)}ms)`,
			config: getConfigForMethod(sizeAnalysis.XLarge.recommended, 'xlarge')
		});
	}

	// Regola per Huge PDFs (con normalizzazione CPU)
	if (sizeAnalysis.Huge && sizeAnalysis.Huge.recommended) {
		rules.push({
			condition: 'pages > cpuNormalizedThreshold(1000, cpuCores, baselineCPU)',
			conditionHuman: `pages > 1000 (normalized for CPU cores)`,
			method: sizeAnalysis.Huge.recommended,
			reason: `Best for huge PDFs (median: ${sizeAnalysis.Huge.recommendedStats.median.toFixed(2)}ms)`,
			config: getConfigForMethod(sizeAnalysis.Huge.recommended, 'huge'),
			cpuNormalized: true,
			baselineCPU: baselineCPU,
			baselineThreshold: 1000
		});
	}

	console.log('Decision Rules:');
	rules.forEach((rule, index) => {
		console.log(`\n${index + 1}. IF ${rule.conditionHuman || rule.condition}`);
		console.log(`   THEN use: ${rule.method}`);
		console.log(`   Config: ${JSON.stringify(rule.config)}`);
		console.log(`   Reason: ${rule.reason}`);
		if (rule.cpuNormalized) {
			console.log(`   💡 CPU-aware: threshold scales with available cores`);
			console.log(`      Examples:`);
			console.log(`        4 cores  → ${Math.floor(rule.baselineThreshold * 4 / baselineCPU)} pages`);
			console.log(`       12 cores  → ${Math.floor(rule.baselineThreshold * 12 / baselineCPU)} pages`);
			console.log(`       24 cores  → ${Math.floor(rule.baselineThreshold * 24 / baselineCPU)} pages (baseline)`);
			console.log(`       48 cores  → ${Math.floor(rule.baselineThreshold * 48 / baselineCPU)} pages`);
		}
	});

	return rules;
}

/**
 * Ottieni la configurazione per un metodo
 */
function getConfigForMethod(method, size) {
	const configs = {
		sequential: {
			parallelizePages: false
		},
		batch: {
			parallelizePages: true,
			batchSize: size === 'tiny' ? 5 : size === 'small' ? 10 : size === 'medium' ? 20 : 50
		},
		stream: {
			chunkSize: size === 'huge' ? 1000 : size === 'xlarge' ? 500 : 200,
			batchSize: 10
		},
		aggressive: {
			chunkSize: 500,
			batchSize: 20
		},
		processes: {
			chunkSize: 500,
			batchSize: 10,
			maxProcesses: 'Math.max(2, cpuCores - 1)'
		},
		workers: {
			chunkSize: 500,
			batchSize: 10,
			maxWorkers: 'Math.max(2, cpuCores - 1)'
		}
	};

	return configs[method] || {};
}

/**
 * Genera codice JavaScript per SmartPDFParser
 */
function generateCode(rules, sizeAnalysis) {
	console.log('\n📝 Generating optimized selectMethod() code...\n');

	let code = `/**
 * Select optimal parsing method based on analysis
 * Auto-generated from ${benchmarks.length} benchmark samples
 * Generated on: ${new Date().toISOString()}
 */
selectMethod(analysis, userOptions) {
	// Check for forced method
	if (this.options.forceMethod) {
		return this.getMethodConfig(this.options.forceMethod, analysis);
	}

	// Check historical benchmarks for this PDF profile
	const historicalBest = this.findHistoricalBest(analysis);
	if (historicalBest) {
		console.log(\`[SmartPDFParser] Using historical best: \${historicalBest.method}\`);
		return this.getMethodConfig(historicalBest.method, analysis);
	}

	const { pages, availableMemory, cpuCores, estimatedComplexity } = analysis;

`;

	// Genera le regole
	rules.forEach((rule, index) => {
		const isFirst = index === 0;
		const isLast = index === rules.length - 1;
		const keyword = isFirst ? 'if' : 'else if';

		code += `	// ${rule.reason}\n`;
		code += `	${keyword} (${rule.condition}) {\n`;
		code += `		return {\n`;
		code += `			name: '${rule.method}',\n`;
		code += `			config: ${JSON.stringify(rule.config, null, 3).replace(/\n/g, '\n\t\t\t')},\n`;
		code += `			parser: ${getParserName(rule.method)}\n`;
		code += `		};\n`;
		code += `	}\n\n`;
	});

	// Fallback
	code += `	// Fallback to batch processing\n`;
	code += `	return {\n`;
	code += `		name: 'batch',\n`;
	code += `		config: { parallelizePages: true, batchSize: 10 },\n`;
	code += `		parser: PDF\n`;
	code += `	};\n`;
	code += `}\n`;

	return code;
}

/**
 * Ottieni il nome del parser per un metodo
 */
function getParserName(method) {
	const parsers = {
		sequential: 'PDF',
		batch: 'PDF',
		stream: 'PDFStream',
		aggressive: 'PDFAggressive',
		processes: 'PDFProcesses',
		workers: 'PDFWorkers'
	};
	return parsers[method] || 'PDF';
}

/**
 * Confronta workers vs processes per trovare il migliore
 */
function compareWorkersVsProcesses(data) {
	const workersData = data.allMethods['workers'];
	const processesData = data.allMethods['processes'];

	if (!workersData || !processesData) return null;
	if (workersData.count < 10 || processesData.count < 10) return null;

	return workersData.median < processesData.median ? 'workers' : 'processes';
}

/**
 * Salva i risultati del training
 */
function saveTrainingResults(sizeAnalysis, complexityAnalysis, rules, code) {
	const report = {
		generatedAt: new Date().toISOString(),
		benchmarksAnalyzed: benchmarks.length,
		sizeAnalysis,
		complexityAnalysis,
		decisionRules: rules,
		generatedCode: code
	};

	const reportFile = './smart-parser-training-report.json';
	fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
	console.log(`\n✓ Training report saved to: ${reportFile}`);

	const codeFile = './smart-parser-optimized.js';
	fs.writeFileSync(codeFile, code);
	console.log(`✓ Optimized code saved to: ${codeFile}`);

	return report;
}

// ============================================================================
// Main execution
// ============================================================================

async function main() {
	try {
		// Analizza per dimensione
		const sizeAnalysis = analyzeBenchmarksBySize();

		// Analizza per complessità
		const complexityAnalysis = analyzeByComplexity();

		// Analizza per CPU cores
		const cpuAnalysis = analyzeByCPUCores();

		// Genera regole
		const rules = generateDecisionRules(sizeAnalysis, cpuAnalysis);

		// Genera codice
		const code = generateCode(rules, sizeAnalysis);

		// Salva risultati
		saveTrainingResults(sizeAnalysis, complexityAnalysis, rules, code);

		console.log('\n' + '='.repeat(70));
		console.log('✅ Training completed successfully!');
		console.log('='.repeat(70));
		console.log('\nNext steps:');
		console.log('1. Review the training report: smart-parser-training-report.json');
		console.log('2. Check the optimized code: smart-parser-optimized.js');
		console.log('3. Update SmartPDFParser.js with the new selectMethod()');
		console.log('4. Test the optimized parser with your PDFs');
		console.log();

	} catch (error) {
		console.error('\n❌ Training failed:', error);
		console.error(error.stack);
		process.exit(1);
	}
}

main();

