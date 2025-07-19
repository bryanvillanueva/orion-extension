
document.addEventListener("DOMContentLoaded", () => {
  const generateBtn = document.getElementById("orion-generate");
  const resultArea = document.getElementById("orion-result");
  const insertBtn = document.getElementById("orion-insert");
  const copyBtn = document.getElementById("orion-copy");
  const closeBtn = document.getElementById("orion-close");

  let selectedText = "";
  let userInstruction = "";

  chrome.storage.local.get("orionUser", (data) => {
    const user = data.orionUser;

    if (!user || !user.orion_user_id) {
      console.warn("🔒 Usuario no autenticado o sin perfil completo.");
      return;
    }

    chrome.runtime.sendMessage({ action: "getSelectedText" }, (response) => {
      selectedText = response.text || "";
      document.getElementById("orion-selected-text-preview").textContent = selectedText;
    });

    generateBtn.addEventListener("click", async () => {
      userInstruction = document.getElementById("orion-user-instruction").value.trim();
      resultArea.value = "Generando respuesta...";
      resultArea.readOnly = true;

      try {
        const res = await fetch("https://orion-production-5768.up.railway.app/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            type: "reply",
            text: selectedText,
            userInstruction: userInstruction
          })
        });

        const data = await res.json();

        if (res.ok && data.result) {
          resultArea.value = data.result;
          resultArea.readOnly = false;

          // Registro del log
          await fetch("https://orion-production-5768.up.railway.app/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              action: "reply",
              input_text: selectedText,
              output_text: data.result,
              source_url: window.location.href
            })
          });

          console.log("📥 Acción registrada en logs");

        } else {
          resultArea.value = "Error generando respuesta";
        }
      } catch (err) {
        console.error("❌ Error en generación o log:", err);
        resultArea.value = "Error al conectar con el servidor";
      }
    });

    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(resultArea.value);
    });

    insertBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "insertText", text: resultArea.value });
    });

    closeBtn.addEventListener("click", () => {
      window.close();
    });
  });
});
