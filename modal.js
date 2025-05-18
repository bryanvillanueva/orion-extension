function closeModal() {
  document.getElementById('orion-modal-overlay')?.remove();
}

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('orion-close');
  const textarea = document.getElementById('orion-selected-text');
  const instruction = document.getElementById('orion-user-instruction');
  const resultArea = document.getElementById('orion-result');
  const copyInsertBtn = document.getElementById('orion-copy-insert');

  if (textarea) autoResizeTextarea(textarea);
  if (resultArea) resultArea.addEventListener('input', () => autoResizeTextarea(resultArea));

  // Cerrar modal
  closeBtn?.addEventListener('click', closeModal);

  // Botones de acción
  const buttons = document.querySelectorAll('#orion-buttons button');
  buttons.forEach(btn => {
    btn.onclick = async () => {
      const type = btn.dataset.type;
      const text = textarea.value;
      const userInstruction = instruction.value || ''; // permitir vacío

      if (!text || !type) return;

      resultArea.value = 'Generando...';
      autoResizeTextarea(resultArea);

      const response = await fetch('https://orion-production-5768.up.railway.app/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, text, userInstruction })
      });

      const data = await response.json();
      resultArea.value = data.result || 'Error generando respuesta';
      autoResizeTextarea(resultArea);
    };
  });

  // Copiar y cerrar + insertar si posible
  copyInsertBtn.onclick = () => {
    const text = resultArea.value;
    if (!text) return;

    navigator.clipboard.writeText(text);

    // Intentar insertar en el campo activo
    const active = document.activeElement;
    if (active && active.tagName === 'TEXTAREA' || active.tagName === 'INPUT') {
      active.value += (active.value ? '\n' : '') + text;
    }

    closeModal();
  };
});
