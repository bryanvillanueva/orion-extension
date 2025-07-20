console.log("✅ Orion content script cargado");

let orionIcon = null;

// Variables globales para plantillas
let selectedTemplateId = null;
let templates = [];
let currentSelectedText = '';

// Limpia íconos y modales previos
function cleanOrion() {
  const modalOverlay = document.getElementById("orion-modal-overlay");
  const floatIcon = document.getElementById("orion-float-icon");
  
  if (modalOverlay) modalOverlay.remove();
  if (floatIcon) floatIcon.remove();
}

// Crea ícono flotante
function showOrionIcon(selectedText) {
  const existingIcon = document.getElementById("orion-float-icon");
  if (existingIcon) existingIcon.remove();

  const orionIcon = document.createElement("img");
  orionIcon.src = chrome.runtime.getURL("icon.png");
  orionIcon.alt = "Orion";
  orionIcon.id = "orion-float-icon";

  Object.assign(orionIcon.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "40px",
    height: "40px",
    cursor: "pointer",
    zIndex: "9999999",
    borderRadius: "50%",
    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
    transition: "transform 0.2s ease-in-out"
  });

  orionIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    showOrionModal(selectedText);
  });

  document.body.appendChild(orionIcon);
}

// Mostrar el modal completo
async function showOrionModal(text) {
  try {
    // Eliminar el ícono flotante si existe
    const existingIcon = document.getElementById("orion-float-icon");
    if (existingIcon) existingIcon.remove();
    console.log("🚀 Mostrando modal con texto:", text);
    
    // Limpiamos cualquier modal existente
    const existingModal = document.getElementById("orion-modal-overlay");
    if (existingModal) existingModal.remove();
    
    // Cargar el HTML del modal
    const modalUrl = chrome.runtime.getURL("modal.html");
    const res = await fetch(modalUrl);
    const html = await res.text();

    // Crear un contenedor temporal
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    
    // Extraer el modal del wrapper
    const modalOverlay = wrapper.querySelector("#orion-modal-overlay");
    if (!modalOverlay) {
      console.error("❌ No se encontró el modal en el HTML");
      return;
    }
    
    // Añadir el modal al documento
    document.body.appendChild(modalOverlay);

    // Cargar CSS
    if (!document.querySelector('link[href*="modal.css"]')) {
      const cssLink = document.createElement("link");
      cssLink.rel = "stylesheet";
      cssLink.href = chrome.runtime.getURL("modal.css");
      document.head.appendChild(cssLink);
    }

    // Establecer el texto seleccionado
    const textPreview = document.getElementById("orion-selected-text-preview");
    if (textPreview) {
      textPreview.textContent = text;
    }

    // Inicializar el modal
    initModal(text);
    
    console.log("✅ Modal mostrado correctamente");

  } catch (err) {
    console.error("❌ Error al mostrar el modal Orion:", err);
  }
}

// Función para auto-redimensionar textarea
function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

// Función para detectar campos de entrada
function findActiveInputField() {
  // Primero, buscar el elemento activo
  const activeElement = document.activeElement;
  
  // Si el elemento activo es un campo de entrada
  if (activeElement && 
      (activeElement.tagName === 'TEXTAREA' || 
       activeElement.tagName === 'INPUT' || 
       activeElement.contentEditable === 'true')) {
    return activeElement;
  }

  // Buscar campos específicos por plataforma
  
  // Gmail
  const gmailCompose = document.querySelector('div[role="textbox"][aria-label*="Message Body"]') ||
                      document.querySelector('div[role="textbox"][g_editable="true"]') ||
                      document.querySelector('div.editable[contenteditable="true"]');
  if (gmailCompose) return gmailCompose;

  // Outlook Web
  const outlookCompose = document.querySelector('div[role="textbox"][aria-label*="Message body"]') ||
                        document.querySelector('div[aria-label="Message body"]');
  if (outlookCompose) return outlookCompose;

  // WhatsApp Web
  const whatsappInput = document.querySelector('div[contenteditable="true"][data-tab="10"]') ||
                       document.querySelector('div[title="Type a message"]');
  if (whatsappInput) return whatsappInput;

  // LinkedIn messaging
  const linkedinInput = document.querySelector('.msg-form__contenteditable') ||
                       document.querySelector('div[role="textbox"][contenteditable="true"]');
  if (linkedinInput) return linkedinInput;

  // Facebook Messenger
  const messengerInput = document.querySelector('div[role="textbox"][contenteditable="true"]');
  if (messengerInput) return messengerInput;

  // Slack
  const slackInput = document.querySelector('.ql-editor[contenteditable="true"]');
  if (slackInput) return slackInput;

  // Buscar cualquier textarea o input visible
  const genericInputs = document.querySelectorAll('textarea:not([readonly]), input[type="text"]:not([readonly]), div[contenteditable="true"]');
  for (const input of genericInputs) {
    const rect = input.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return input;
    }
  }

  return null;
}

// Función para insertar texto en un campo
function insertTextIntoField(field, text) {
  if (!field || !text) return false;

  try {
    // Para elementos contenteditable (Gmail, WhatsApp, etc.)
    if (field.contentEditable === 'true') {
      field.focus();
      
      // Intentar usar el API de Selection para mejor compatibilidad
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(field);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Insertar el texto
      document.execCommand('insertText', false, text);
      
      // Disparar eventos para asegurar que la plataforma detecte el cambio
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      
      return true;
    }
    
    // Para textarea o input normal
    if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') {
      const start = field.selectionStart;
      const end = field.selectionEnd;
      const currentValue = field.value;
      
      // Insertar en la posición del cursor
      field.value = currentValue.substring(0, start) + text + currentValue.substring(end);
      
      // Mover el cursor al final del texto insertado
      field.selectionStart = field.selectionEnd = start + text.length;
      
      field.focus();
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error insertando texto:', error);
    return false;
  }
}

// FUNCIONES DE PLANTILLAS

// Función para inicializar la funcionalidad de plantillas
function initTemplatesFeature(selectedText) {
  currentSelectedText = selectedText;
  
  // Inicializar event listeners para la navegación entre vistas
  document.getElementById('orion-template-btn')?.addEventListener('click', showTemplatesView);
  document.getElementById('orion-back-to-main')?.addEventListener('click', showMainView);
  document.getElementById('orion-back-to-templates')?.addEventListener('click', showTemplatesView);
  document.getElementById('orion-back-from-use')?.addEventListener('click', showTemplatesView);
  
  // Event listeners para crear/editar plantillas
  document.getElementById('orion-create-template-btn')?.addEventListener('click', showCreateTemplateView);
  document.getElementById('orion-template-save')?.addEventListener('click', saveTemplate);
  document.getElementById('orion-template-cancel')?.addEventListener('click', showTemplatesView);
  
  // Event listeners para usar plantillas
  document.getElementById('orion-use-template')?.addEventListener('click', applySelectedTemplate);
  document.getElementById('orion-edit-selected-template')?.addEventListener('click', editSelectedTemplate);
}

// Cambiar entre las diferentes vistas
function showView(viewName) {
  // Ocultar todas las vistas
  document.querySelectorAll('.orion-view').forEach(view => {
    view.style.display = 'none';
  });
  
  // Mostrar la vista solicitada
  const viewToShow = document.querySelector(`.orion-view[data-view="${viewName}"]`);
  if (viewToShow) {
    viewToShow.style.display = 'block';
  }
}

function showMainView() {
  showView('main');
}

function showTemplatesView() {
  console.log("Mostrando vista de plantillas...");
  // Cargar las plantillas del usuario antes de mostrar la vista
  loadUserTemplates().then(() => {
    console.log("Plantillas cargadas, mostrando vista");
    showView('templates');
  }).catch(err => {
    console.error("Error al cargar plantillas:", err);
    showEmptyTemplates("Error al cargar plantillas");
    showView('templates');
  });
}

function showCreateTemplateView() {
  // Limpiar el formulario
  document.getElementById('orion-template-name').value = '';
  document.getElementById('orion-template-content').value = '';
  document.getElementById('orion-template-edit-title').textContent = 'Nueva Plantilla';
  selectedTemplateId = null;
  
  showView('template-edit');
}

function showEditTemplateView(templateId) {
  const template = templates.find(t => t.id === templateId);
  if (!template) return;
  
  document.getElementById('orion-template-name').value = template.title;
  document.getElementById('orion-template-content').value = template.content;
  document.getElementById('orion-template-edit-title').textContent = 'Editar Plantilla';
  selectedTemplateId = templateId;
  
  showView('template-edit');
}

function showUseTemplateView(templateId) {
  const template = templates.find(t => t.id === templateId);
  if (!template) return;
  
  selectedTemplateId = templateId;
  
  // Mostrar preview de la plantilla con el texto seleccionado
  const previewContent = processTemplate(template.content, currentSelectedText);
  document.getElementById('orion-template-preview-content').textContent = previewContent;
  
  showView('template-use');
}

// Cargar plantillas del usuario desde el backend
async function loadUserTemplates() {
  try {
    console.log("Intentando cargar plantillas...");
    // Obtener el usuario actual de chrome.storage
    return new Promise((resolve) => {
      chrome.storage.local.get("orionUser", async (data) => {
        console.log("Datos del usuario:", data.orionUser);
        if (!data.orionUser || !data.orionUser.id) {
          console.log("⚠️ Usuario no autenticado, no se pueden cargar plantillas");
          showEmptyTemplates("Inicia sesión para ver tus plantillas");
          resolve();
          return;
        }
        
        const userId = data.orionUser.orion_user_id;
        console.log("ID de usuario para cargar plantillas:", userId);
        
        try {
          // Hacer la solicitud al backend
          const url = `https://orion-production-5768.up.railway.app/templates?userId=${userId}`;
          console.log("URL de solicitud:", url);
          
          const response = await fetch(url, {
            credentials: 'include' 
          });
          console.log("Status de respuesta:", response.status);
          
          const responseData = await response.json();
          console.log("Respuesta de plantillas:", responseData);
          
          if (response.ok) {
            templates = responseData.templates || [];
            console.log("Plantillas cargadas:", templates.length);
            renderTemplatesList();
          } else {
            console.error("❌ Error cargando plantillas:", responseData.error);
            showEmptyTemplates("Error al cargar plantillas");
          }
          resolve();
        } catch (err) {
          console.error("❌ Error en la solicitud de plantillas:", err);
          showEmptyTemplates("Error de conexión al servidor");
          resolve();
        }
      });
    });
  } catch (error) {
    console.error("❌ Error en loadUserTemplates:", error);
    showEmptyTemplates("Error de conexión");
    return Promise.resolve();
  }
}

// Mostrar mensaje cuando no hay plantillas
function showEmptyTemplates(message = "No tienes plantillas guardadas") {
  const templatesListEl = document.getElementById('orion-templates-list');
  if (templatesListEl) {
    templatesListEl.innerHTML = `
      <div class="orion-templates-empty">
        <p>${message}</p>
      </div>
    `;
  }
}

// Renderizar la lista de plantillas
function renderTemplatesList() {
  const templatesListEl = document.getElementById('orion-templates-list');
  if (!templatesListEl) return;
  
  if (!templates.length) {
    showEmptyTemplates();
    return;
  }
  
  // Ordenar por fecha de creación (más reciente primero)
  templates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  // Crear el HTML para cada plantilla
  const templatesHTML = templates.map(template => {
    const date = new Date(template.created_at);
    const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    
    return `
      <div class="orion-template-item" data-id="${template.id}">
        <div class="orion-template-info">
          <div class="orion-template-title">${template.title}</div>
          <div class="orion-template-date">Creada: ${formattedDate}</div>
        </div>
        <div class="orion-template-actions">
          <button class="orion-template-edit" title="Editar plantilla">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.4745 5.40801L18.5917 7.52524M17.8358 3.54289L11.6716 9.70711C11.2909 10.0878 11.0489 10.3284 10.8576 10.6068C10.6841 10.8544 10.5483 11.1244 10.4549 11.4078C10.3506 11.7235 10.3043 12.0571 10.2116 12.7243L10 14L11.2757 13.7884C11.9429 13.6957 12.2765 13.6494 12.5922 13.5451C12.8756 13.4517 13.1456 13.3159 13.3932 13.1424C13.6716 12.9511 13.9122 12.7091 14.2929 12.3284L20.4571 6.16421C21.181 5.44037 21.181 4.26673 20.4571 3.54289C19.7333 2.81905 18.5597 2.81905 17.8358 3.54289Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M20 14V17.8C20 18.9201 20 19.4801 19.782 19.908C19.5903 20.2843 19.2843 20.5903 18.908 20.782C18.4802 21 17.9201 21 16.8 21H6.2C5.07989 21 4.51984 21 4.09202 20.782C3.71569 20.5903 3.40973 20.2843 3.21799 19.908C3 19.4801 3 18.9201 3 17.8V7.2C3 6.0799 3 5.51984 3.21799 5.09202C3.40973 4.71569 3.71569 4.40973 4.09202 4.21799C4.51984 4 5.0799 4 6.2 4H10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="orion-template-delete" title="Eliminar plantilla">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 9V19M8 9V19M12 9V19M20 5H4M18 5L17.2736 3.54538C17.107 3.214 17.0237 3.04832 16.9072 2.92292C16.8038 2.81277 16.6824 2.72579 16.5482 2.66465C16.3962 2.59487 16.2269 2.56935 15.8882 2.51832C15.2188 2.41957 14.9041 2.37019 14.5856 2.3445C14.2931 2.32111 14 2.32111 13.7075 2.3445C13.389 2.37019 13.0743 2.41957 12.4049 2.51832C12.0662 2.56935 11.8969 2.59487 11.7448 2.66465C11.6107 2.72579 11.4893 2.81277 11.3859 2.92292C11.2694 3.04832 11.186 3.214 11.0195 3.54538L10.2931 5M21 5H3V7.8C3 8.41006 3 8.71509 3.07612 8.9549C3.14199 9.16472 3.25078 9.35692 3.39239 9.51849C3.55496 9.69853 3.78042 9.82758 4.23134 10.0857L4.4 10.2M21 5L19.6 16.8C19.5281 17.3132 19.4922 17.5699 19.3913 17.7756C19.3015 17.9575 19.1714 18.1169 19.01 18.2435C18.8276 18.3866 18.6012 18.473 18.1483 18.6457L17.8 18.8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  templatesListEl.innerHTML = templatesHTML;
  
  // Agregar event listeners a los elementos generados
  templatesListEl.querySelectorAll('.orion-template-item').forEach(item => {
    // Click en el item para seleccionar plantilla
    item.addEventListener('click', (e) => {
      // Ignorar si el click fue en los botones de acción
      if (e.target.closest('.orion-template-edit') || e.target.closest('.orion-template-delete')) {
        return;
      }
      
      const templateId = item.dataset.id;
      showUseTemplateView(templateId);
    });
    
    // Click en botón de editar
    item.querySelector('.orion-template-edit').addEventListener('click', (e) => {
      e.stopPropagation();
      const templateId = item.dataset.id;
      showEditTemplateView(templateId);
    });
    
    // Click en botón de eliminar
    item.querySelector('.orion-template-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      const templateId = item.dataset.id;
      deleteTemplate(templateId);
    });
  });
}

// Procesar una plantilla reemplazando variables
function processTemplate(templateContent, selectedText) {
  const now = new Date();
  const dateStr = now.toLocaleDateString();
  
  // Determinar saludo basado en la hora
  let greeting = 'Hola';
  const hour = now.getHours();
  if (hour < 12) {
    greeting = 'Buenos días';
  } else if (hour < 19) {
    greeting = 'Buenas tardes';
  } else {
    greeting = 'Buenas noches';
  }
  
  // Reemplazar variables
  return templateContent
    .replace(/{{texto}}/g, selectedText)
    .replace(/{{fecha}}/g, dateStr)
    .replace(/{{saludo}}/g, greeting);
}

// Guardar una plantilla (nueva o existente)
async function saveTemplate() {
  const titleInput = document.getElementById('orion-template-name');
  const contentInput = document.getElementById('orion-template-content');
  
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  
  // Validación básica
  if (!title) {
    alert('Por favor ingresa un nombre para la plantilla');
    titleInput.focus();
    return;
  }
  
  if (!content) {
    alert('El contenido de la plantilla no puede estar vacío');
    contentInput.focus();
    return;
  }
  
  try {
    // Obtener el usuario actual
    chrome.storage.local.get("orionUser", async (data) => {
      if (!data.orionUser || !data.orionUser.id) {
        alert('Debes iniciar sesión para guardar plantillas');
        return;
      }
      
      const userId = data.orionUser.id;
      
      // Construir el objeto de plantilla
      const templateData = {
        user_id: userId,
        title: title,
        content: content
      };
      
      // Si estamos editando, incluir el ID
      if (selectedTemplateId) {
        templateData.id = selectedTemplateId;
      }
      
      // Enviar al backend
      const response = await fetch('https://orion-production-5768.up.railway.app/templates', {
        method: selectedTemplateId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', 
        body: JSON.stringify(templateData)
      });
      
      const responseData = await response.json();
      
      if (response.ok) {
        console.log("✅ Plantilla guardada correctamente");
        // Volver a la vista de plantillas y recargar
        showTemplatesView();
      } else {
        console.error("❌ Error guardando plantilla:", responseData.error);
        alert(`Error al guardar la plantilla: ${responseData.error || 'Intenta nuevamente'}`);
      }
    });
  } catch (error) {
    console.error("❌ Error en saveTemplate:", error);
    alert('Error de conexión al guardar la plantilla');
  }
}

// Eliminar una plantilla
async function deleteTemplate(templateId) {
  if (!confirm('¿Estás seguro de que deseas eliminar esta plantilla?')) {
    return;
  }
  
  try {
    // Hacer la solicitud al backend
    const response = await fetch(`https://orion-production-5768.up.railway.app/templates/${templateId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (response.ok) {
      console.log("✅ Plantilla eliminada correctamente");
      // Actualizar la lista de plantillas
      templates = templates.filter(t => t.id !== templateId);
      renderTemplatesList();
    } else {
      const data = await response.json();
      console.error("❌ Error eliminando plantilla:", data.error);
      alert(`Error al eliminar la plantilla: ${data.error || 'Intenta nuevamente'}`);
    }
  } catch (error) {
    console.error("❌ Error en deleteTemplate:", error);
    alert('Error de conexión al eliminar la plantilla');
  }
}

// Aplicar la plantilla seleccionada al texto
function applySelectedTemplate() {
  const template = templates.find(t => t.id === selectedTemplateId);
  if (!template) return;
  
  const processedText = processTemplate(template.content, currentSelectedText);
  
  // Mostrar el resultado en la vista principal
  const resultArea = document.getElementById('orion-result');
  const resultContainer = document.getElementById('orion-result-container');
  
  if (resultArea && resultContainer) {
    resultArea.value = processedText;
    resultContainer.style.display = 'block';
    autoResizeTextarea(resultArea);
    
    // Habilitar botón de traducir si hay contenido
    const translateBtn = document.getElementById('orion-translate');
    if (translateBtn) {
      translateBtn.disabled = !processedText.trim();
    }
  }
  
  // Volver a la vista principal
  showMainView();
}

// Editar la plantilla seleccionada actualmente
function editSelectedTemplate() {
  if (!selectedTemplateId) return;
  showEditTemplateView(selectedTemplateId);
}

// Función para inicializar el modal
function initModal(selectedText) {
  const closeBtn = document.getElementById('orion-close');
  const textPreview = document.getElementById('orion-selected-text-preview');
  const toggleTextBtn = document.getElementById('orion-toggle-text');
  const instruction = document.getElementById('orion-user-instruction');
  const resultArea = document.getElementById('orion-result');
  const resultContainer = document.getElementById('orion-result-container');
  const copyBtn = document.getElementById('orion-copy');
  const insertBtn = document.getElementById('orion-insert');
  const translateBtn = document.getElementById('orion-translate');
  const languageSelector = document.getElementById('orion-language-selector');
  const overlay = document.getElementById('orion-modal-overlay');

  // Función para cerrar el modal
  function closeModal() {
    const modalToRemove = document.getElementById('orion-modal-overlay');
    if (modalToRemove) modalToRemove.remove();
  }

  // Event listeners para cerrar
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });
  }

  // Toggle para mostrar/ocultar texto completo
  if (toggleTextBtn && textPreview) {
    toggleTextBtn.addEventListener('click', () => {
      textPreview.classList.toggle('expanded');
      const expandIcon = toggleTextBtn.querySelector('.expand-icon');
      const collapseIcon = toggleTextBtn.querySelector('.collapse-icon');
      
      if (textPreview.classList.contains('expanded')) {
        expandIcon.style.display = 'none';
        collapseIcon.style.display = 'inline';
      } else {
        expandIcon.style.display = 'inline';
        collapseIcon.style.display = 'none';
      }
    });
  }

  // Auto-resize para textareas
  if (resultArea) {
    resultArea.addEventListener('input', () => {
      autoResizeTextarea(resultArea);
      
      // Habilitar/deshabilitar botón de traducir
      if (translateBtn) {
        translateBtn.disabled = !resultArea.value.trim();
      }
    });
  }

  // Botones de acción (generar, reescribir, etc.)
  const buttons = document.querySelectorAll('#orion-buttons button[data-type]');
  buttons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const type = btn.dataset.type;
      const text = selectedText; // Usar el texto guardado
      const userInstruction = instruction?.value || '';

      if (!text || !type) {
        console.error("❌ Falta texto o tipo de acción");
        return;
      }

      // Mostrar el contenedor de resultado
      if (resultContainer) {
        resultContainer.style.display = 'block';
      }

      // Ocultar el selector de idioma si está visible
      if (languageSelector) {
        languageSelector.style.display = 'none';
      }

      if (resultArea) {
        resultArea.value = 'Generando...';
        autoResizeTextarea(resultArea);
      }

      try {
        const response = await fetch('https://orion-production-5768.up.railway.app/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, text, userInstruction })
        });

        const data = await response.json();

        if (resultArea) {
          resultArea.value = data.result || 'Error generando respuesta';
          // Guardar log en el backend
chrome.storage.local.get("orionUser", async (dataUser) => {
  if (dataUser.orionUser?.orion_user_id) {
    try {
      await fetch('https://orion-production-5768.up.railway.app/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 🔑 Necesario para que req.user esté disponible
        body: JSON.stringify({
          action: type,                       // 'generate', 'rewrite', etc.
          input_text: text,                   // el texto original
          output_text: data.result,           // lo generado
          source_url: window.location.href    // para saber de dónde vino
        })
      });
      console.log("✅ Log registrado correctamente");
    } catch (err) {
      console.warn("⚠️ Error al enviar el log:", err);
    }
  }
});

          resultArea.removeAttribute('readonly'); // Hacer editable
          autoResizeTextarea(resultArea);
          
          // Habilitar el botón de traducir si hay contenido
          if (translateBtn) {
            translateBtn.disabled = !resultArea.value.trim();
          }
        }
      } catch (error) {
        console.error("❌ Error en la petición:", error);
        if (resultArea) {
          resultArea.value = 'Error al conectar con el servidor';
          resultArea.removeAttribute('readonly'); // Hacer editable
          autoResizeTextarea(resultArea);
        }
      }
    });
  });

  // Botón de copiar y cerrar
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const text = resultArea?.value;
      if (!text) return;

      try {
        await navigator.clipboard.writeText(text);
        console.log("✅ Texto copiado al portapapeles");
        closeModal();
      } catch (err) {
        console.error("❌ Error al copiar:", err);
        alert('Error al copiar el texto');
      }
    });
  }

  // Botón de insertar respuesta
  if (insertBtn) {
    insertBtn.addEventListener('click', () => {
      const text = resultArea?.value;
      if (!text) return;

      const inputField = findActiveInputField();
      if (inputField) {
        const success = insertTextIntoField(inputField, text);
        if (success) {
          console.log("✅ Texto insertado en el campo");
          closeModal();
        } else {
          alert('No se pudo insertar el texto en el campo');
        }
      } else {
        alert('No se encontró un campo de entrada activo');
      }
    });
  }

  // Botón de traducir
  if (translateBtn) {
    // Inicialmente deshabilitado
    translateBtn.disabled = true;
    
    translateBtn.addEventListener('click', () => {
      // Mostrar/ocultar selector de idioma
      if (languageSelector) {
        if (languageSelector.style.display === 'none') {
          languageSelector.style.display = 'block';
        } else {
          languageSelector.style.display = 'none';
        }
      }
    });
  }

  // Botones de idioma
  const languageButtons = document.querySelectorAll('.language-buttons button');
  languageButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      // Obtener el idioma seleccionado
      const language = btn.dataset.lang;
      const textToTranslate = resultArea?.value;
      
      if (!textToTranslate || !language) return;
      
      // Mostrar estado
      resultArea.value = `Traduciendo al ${btn.textContent}...`;
      
      // Ocultar selector de idioma
      if (languageSelector) {
        languageSelector.style.display = 'none';
      }
      
      try {
        const response = await fetch('https://orion-production-5768.up.railway.app/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'translate',
            text: textToTranslate,
            userInstruction: language
          })
        });

        const data = await response.json();
        
        if (resultArea) {
          resultArea.value = data.result || `Error traduciendo al ${language}`;
          autoResizeTextarea(resultArea);
        }
      } catch (error) {
        console.error("❌ Error en la traducción:", error);
        if (resultArea) {
          resultArea.value = 'Error al conectar con el servidor';
          autoResizeTextarea(resultArea);
        }
      }
    });
  });

  // Verificar si hay un campo de entrada disponible
  function updateInsertButtonState() {
    if (insertBtn) {
      const inputField = findActiveInputField();
      if (inputField) {
        insertBtn.disabled = false;
        insertBtn.title = 'Insertar respuesta en el campo activo';
      } else {
        insertBtn.disabled = true;
        insertBtn.title = 'No hay campo de entrada disponible';
      }
    }
  }

  // Actualizar el estado del botón al iniciar
  updateInsertButtonState();
  
  // Actualizar periódicamente por si cambia el estado
  const intervalId = setInterval(updateInsertButtonState, 1000);
  
  // Limpiar el intervalo cuando se cierre el modal
  const originalCloseModal = closeModal;
  closeModal = function() {
    clearInterval(intervalId);
    originalCloseModal();
  };
  
  // AQUÍ AGREGAMOS LA INICIALIZACIÓN DE PLANTILLAS
  // Inicializar la funcionalidad de plantillas
  initTemplatesFeature(selectedText);
}

// Detectar selección de texto
document.addEventListener("mouseup", (e) => {
  // No hacer nada si el click fue en el modal o en el ícono
  if (e.target.closest('#orion-modal-overlay') || e.target.closest('#orion-float-icon')) return;

  chrome.storage.local.get("orionUser", (data) => {
    if (!data.orionUser || !data.orionUser.email) {
      console.log("⚠️ Usuario no autenticado, no se muestra Orion");
      return;
    }

    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      if (selectedText) {
        try {
          showOrionIcon(selectedText);
        } catch (err) {
          console.error("❌ Error al mostrar el ícono Orion:", err);
        }
      } else {
        const existingIcon = document.getElementById("orion-float-icon");
        if (existingIcon) existingIcon.remove();
      }
    }, 10);
  });
});

// Limpiar cuando se pierde la selección
document.addEventListener("selectionchange", () => {
  const selection = window.getSelection();
  if (!selection.toString().trim()) {
    const existingIcon = document.getElementById("orion-float-icon");
    if (existingIcon) existingIcon.remove();
  }
});