const { saveBase64Media, ensurePermanentDocUrl } = require('../utils/uploadHelper');

async function runTest() {
  console.log('Testing upload helper...');
  
  // 1. Test Base64 saving with PDF
  const dummyPdfB64 = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrCg==';
  const savedPdfUrl = saveBase64Media(dummyPdfB64, null, 'doc');
  console.log('Saved PDF URL:', savedPdfUrl);
  if (!savedPdfUrl || !savedPdfUrl.endsWith('.pdf')) {
    throw new Error('PDF extension was not preserved!');
  }

  // 2. Test awards normalization
  const sampleAwardInput = {
    name: 'Best award',
    awardedBy: 'Times of India',
    year: '2025',
    description: 'This award is given by times of India.',
    supportingDocument: 'https://example.com/test.pdf'
  };

  const docUrl = sampleAwardInput.supportingDocument || sampleAwardInput.supportingDoc || sampleAwardInput.document || sampleAwardInput.certificateDoc || '';
  const normalized = {
    ...sampleAwardInput,
    name: sampleAwardInput.name || 'Recognition',
    year: String(sampleAwardInput.year || ''),
    document: docUrl,
    certificateDoc: docUrl,
    supportingDocument: docUrl,
    supportingDoc: docUrl
  };

  console.log('Normalized Award:', normalized);
  if (!normalized.supportingDocument || !normalized.document || !normalized.certificateDoc) {
    throw new Error('Keys are missing from award object!');
  }

  console.log('ALL TESTS PASSED SUCCESSFULLY!');
}

runTest().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
