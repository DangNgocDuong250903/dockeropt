// Simple textarea editor (Monaco is complex for this demo, using enhanced textarea)
export function createEditor(containerId, initialValue = '') {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const textarea = document.createElement('textarea');
  textarea.className = 'w-full h-96 p-4 font-mono text-sm bg-gray-900 text-gray-100 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none';
  textarea.value = initialValue;
  textarea.placeholder = 'Paste your Dockerfile here...';
  textarea.spellcheck = false;

  container.innerHTML = '';
  container.appendChild(textarea);

  // Add line numbers (optional enhancement)
  addLineNumbers(container, textarea);

  return {
    getValue: () => textarea.value,
    setValue: (value) => {
      textarea.value = value;
      updateLineNumbers(container, textarea);
    },
    getContainer: () => container,
  };
}

function addLineNumbers(container, textarea) {
  const wrapper = document.createElement('div');
  wrapper.className = 'relative';
  
  const lineNumbers = document.createElement('div');
  lineNumbers.className = 'absolute left-0 top-0 p-4 pr-2 font-mono text-sm text-gray-500 select-none pointer-events-none';
  lineNumbers.id = 'line-numbers';
  
  container.style.position = 'relative';
  textarea.style.paddingLeft = '3.5rem';
  
  updateLineNumbers(container, textarea);
  
  textarea.addEventListener('input', () => updateLineNumbers(container, textarea));
  textarea.addEventListener('scroll', () => {
    if (lineNumbers) {
      lineNumbers.style.transform = `translateY(-${textarea.scrollTop}px)`;
    }
  });
}

function updateLineNumbers(container, textarea) {
  let lineNumbers = container.querySelector('#line-numbers');
  if (!lineNumbers) return;
  
  const lines = textarea.value.split('\n').length;
  lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
}

