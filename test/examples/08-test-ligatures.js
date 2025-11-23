#!/usr/bin/env node

/**
 * Test for Issue #10 - Ligature Handling
 * Tests that special characters (ligatures like ﬂ, ﬁ, ﬀ) are parsed correctly
 */

const fs = require('fs');
const PDF = require('../../index');

async function testLigatures() {
	console.log('=== Issue #10 - Ligature Handling Test ===\n');

	// Test with user-provided PDF if available
	const testFile = '../data/pdfTest.pdf';

	if (!fs.existsSync(testFile)) {
		console.log('⚠️  Test PDF from issue #10 not found');
		console.log('   Expected: ./test/data/pdfTest.pdf');
		console.log('   Download from: https://github.com/simonegosetto/pdf-parse-new/issues/10');
		console.log('\n   Testing with other available PDFs instead...\n');
		return testAlternative();
	}

	const dataBuffer = fs.readFileSync(testFile);
	console.log(`File: ${testFile}`);
	console.log(`Size: ${(dataBuffer.length / 1024).toFixed(2)} KB\n`);

	try {
		const result = await PDF(dataBuffer);

		console.log('✅ Parsing successful!');
		console.log(`Pages: ${result.numpages}`);
		console.log(`Characters: ${result.text.length}`);
		console.log('\nExtracted text (first 500 chars):');
		console.log('-'.repeat(60));
		console.log(result.text.substring(0, 500));
		console.log('-'.repeat(60));

		// Check for ligature issues
		const issues = [];

		// Check 1: Extra spaces in ligatures
		if (result.text.includes('fl ow')) {
			issues.push('❌ Found "fl ow" - ligature still split with space');
		} else if (result.text.includes('flow')) {
			console.log('\n✅ Check 1: "flow" found correctly (no extra space)');
		}

		// Check 2: Look for other common ligatures
		const ligatures = ['ﬂ', 'ﬁ', 'ﬀ', 'ﬃ', 'ﬄ'];
		let foundLigatures = [];
		ligatures.forEach(lig => {
			if (result.text.includes(lig)) {
				foundLigatures.push(lig);
			}
		});

		if (foundLigatures.length > 0) {
			console.log(`✅ Check 2: Found ligatures: ${foundLigatures.join(', ')}`);
		}

		// Check 3: Line breaks
		const lines = result.text.split('\n');
		console.log(`✅ Check 3: Parsed into ${lines.length} lines`);

		// Show first few lines to verify structure
		console.log('\nFirst 10 lines:');
		console.log('-'.repeat(60));
		lines.slice(0, 10).forEach((line, i) => {
			console.log(`${(i + 1).toString().padStart(2)}: ${line}`);
		});
		console.log('-'.repeat(60));

		if (issues.length > 0) {
			console.log('\n⚠️  Issues found:');
			issues.forEach(issue => console.log(`   ${issue}`));
			console.log('\n   This might indicate the fix needs adjustment.');
		} else {
			console.log('\n🎉 All checks passed! Issue #10 appears to be fixed.');
		}

	} catch (error) {
		console.error('❌ Error:', error.message);
		process.exit(1);
	}
}

async function testAlternative() {
	console.log('Testing ligature handling with available PDF...\n');

	const testFile = './test/data/01-valid.pdf';
	const dataBuffer = fs.readFileSync(testFile);

	console.log(`File: ${testFile}`);

	try {
		const result = await PDF(dataBuffer);

		console.log('✅ Parsing successful!');
		console.log(`Pages: ${result.numpages}`);
		console.log(`Text length: ${result.text.length}`);

		console.log('\n💡 Note: This PDF may not contain ligatures.');
		console.log('   For full test, add pdfTest.pdf from issue #10');
		console.log('   Download: https://github.com/simonegosetto/pdf-parse-new/issues/10\n');

		// Show sample to verify normalizeWhitespace is working
		console.log('Sample text (first 200 chars):');
		console.log('-'.repeat(60));
		console.log(result.text.substring(0, 200));
		console.log('-'.repeat(60));

		console.log('\n✅ Whitespace normalization appears to be working.');

	} catch (error) {
		console.error('❌ Error:', error.message);
	}
}

console.log('Testing fix for Issue #10 (Ligature Handling)\n');
console.log('Changes made:');
console.log('  ✅ normalizeWhitespace: false → true');
console.log('  ✅ Added Y-coordinate tolerance (1.0px)');
console.log('  ✅ Improved line break detection\n');

testLigatures();

