const imageInput = document.getElementById('imageInput');
const previewImage = document.getElementById('previewImage');
const extractBtn = document.getElementById('extractBtn');
const statusEl = document.getElementById('status');
const warningEl = document.getElementById('confidenceWarning');

const nameField = document.getElementById('nameField');
const phoneField = document.getElementById('phoneField');
const emailField = document.getElementById('emailField');
const summaryField = document.getElementById('summaryField');

let selectedFile = null;
let previewUrl = '';

imageInput.addEventListener('change', (event) => {
  const [file] = event.target.files;
  selectedFile = file || null;

  if (!selectedFile) {
    clearPreview();
    extractBtn.disabled = true;
    statusEl.textContent = 'Select an image to begin.';
    return;
  }

  if (!selectedFile.type.startsWith('image/')) {
    clearPreview();
    selectedFile = null;
    extractBtn.disabled = true;
    statusEl.textContent = 'The selected file is not an image. Please choose a screenshot image.';
    return;
  }

  showPreview(selectedFile);
  extractBtn.disabled = false;
  statusEl.textContent = 'Ready to extract. Tap the button below.';
});

extractBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  setExtractState(true);
  resetResults();

  try {
    statusEl.textContent = 'Extracting text from screenshot...';

    const result = await Tesseract.recognize(selectedFile, 'eng', {
      logger: (message) => {
        if (message.status === 'recognizing text') {
          statusEl.textContent = `Extracting text... ${Math.round(message.progress * 100)}%`;
        }
      }
    });

    const text = result.data.text || '';
    const parsed = parseExtractedText(text);

    nameField.value = parsed.name;
    phoneField.value = parsed.mobile;
    emailField.value = parsed.email;
    summaryField.value = parsed.summary;

    const avgConfidence = getAverageConfidence(result.data.words || []);
    showConfidenceWarning(avgConfidence);

    statusEl.textContent = 'Extraction complete. You can edit any field.';
  } catch (error) {
    statusEl.textContent = 'Extraction failed. Please try another screenshot.';
    warningEl.textContent = `Error: ${error.message}`;
    warningEl.classList.remove('hidden');
  } finally {
    setExtractState(false);
  }
});

function showPreview(file) {
  clearPreview();
  previewUrl = URL.createObjectURL(file);
  previewImage.onload = () => {
    statusEl.textContent = 'Ready to extract. Tap the button below.';
  };
  previewImage.onerror = () => {
    statusEl.textContent = 'Preview unavailable for this image, but extraction can still run.';
    previewImage.classList.add('hidden');
  };
  previewImage.src = previewUrl;
  previewImage.classList.remove('hidden');
}

function clearPreview() {
  previewImage.src = '';
  previewImage.onload = null;
  previewImage.onerror = null;
  previewImage.classList.add('hidden');

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = '';
  }
}

function setExtractState(isExtracting) {
  extractBtn.disabled = isExtracting || !selectedFile;
  extractBtn.textContent = isExtracting ? 'Extracting...' : 'Extract';
}

function resetResults() {
  nameField.value = '';
  phoneField.value = '';
  emailField.value = '';
  summaryField.value = '';
  warningEl.textContent = '';
  warningEl.classList.add('hidden');
}

function parseExtractedText(rawText) {
  const normalized = rawText.replace(/\r/g, '').trim();
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const fullText = lines.join(' ');

  const emailMatch = fullText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  const email = emailMatch ? emailMatch[0] : '';

  const phoneMatch = fullText.match(/(?:\+?\d[\d\s().-]{7,}\d)/g);
  const mobile = phoneMatch ? phoneMatch[0] : '';

  const name = findBestName(lines, email, mobile);

  const summaryLines = lines.filter((line) => {
    if (email && line.includes(email)) return false;
    if (mobile && line.includes(mobile)) return false;
    if (name && line === name) return false;
    return true;
  });

  return {
    name,
    mobile,
    email,
    summary: summaryLines.join('\n')
  };
}

function findBestName(lines, email, mobile) {
  for (const line of lines) {
    if (!line) continue;
    if (email && line.includes(email)) continue;
    if (mobile && line.includes(mobile)) continue;
    if (/\d/.test(line)) continue;

    const words = line.split(/\s+/).filter(Boolean);
    if (words.length >= 2 && words.length <= 4) {
      const normalizedWords = words.filter((word) => /^[A-Za-z'.-]+$/.test(word));
      if (normalizedWords.length === words.length) {
        return words.join(' ');
      }
    }
  }

  return lines[0] || '';
}

function getAverageConfidence(words) {
  if (!words.length) return 0;
  const total = words.reduce((sum, word) => sum + (word.confidence || 0), 0);
  return total / words.length;
}

function showConfidenceWarning(confidence) {
  if (confidence >= 80) {
    warningEl.classList.add('hidden');
    return;
  }

  warningEl.textContent = `Low OCR confidence (${confidence.toFixed(
    1
  )}%). Please verify extracted values.`;
  warningEl.classList.remove('hidden');
}
