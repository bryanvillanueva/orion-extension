document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('loginBtn');
  const loginGoogle = document.getElementById('loginGoogle');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginForm = document.getElementById('login-form');
  const userAccount = document.getElementById('user-account');
  const userLabel = document.getElementById('userLabel');
  const userSetupForm = document.getElementById('user-setup-form');
  const saveProfileBtn = document.getElementById('saveProfileBtn');

  function updateUI(user) {
    const loginForm = document.getElementById('login-form');
    const userAccount = document.getElementById('user-account');
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    const title = document.getElementById('popup-title');

    if (user && user.email) {
      loginForm.style.display = 'none';
      userSetupForm.style.display = 'none';
      userAccount.style.display = 'block';
      userEmailDisplay.textContent = user.email;
      title.textContent = '¡Bienvenido de vuelta!';
      chrome.storage.local.set({ orionUser: user });
    } else {
      loginForm.style.display = 'block';
      userAccount.style.display = 'none';
      userSetupForm.style.display = 'none';
      title.textContent = 'Iniciar sesión en Orion';
      chrome.storage.local.remove('orionUser');
    }
  }

  async function checkSession() {
    try {
      const res = await fetch('https://orion-production-5768.up.railway.app/me', {
        credentials: 'include'
      });
     if (res.ok) {
  const user = await res.json();

if (user.orion_user_id && Number.isInteger(user.orion_user_id)) {
  updateUI(user);
} else {
  chrome.storage.local.remove('orionUser'); // evita persistencia incorrecta
  showUserSetupForm(user);
}

} else {
  updateUI(null);
}
    } catch {
      updateUI(null);
    }
  }

  checkSession();

  // Capturar evento postMessage desde la ventana popup
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'orion-auth-success') {
      const { user, needsSetup } = event.data;
      if (needsSetup) {
        showUserSetupForm(user);
      } else {
        chrome.storage.local.set({ orionUser: user }, () => updateUI(user));
      }
    }
  });

  function showUserSetupForm(user) {
    loginForm.style.display = 'none';
    userSetupForm.style.display = 'block';
    window.orionTempUser = user; // guardamos datos temporales del login
  }

  // Guardar perfil después del login si no tenía orion_user_id
  saveProfileBtn.addEventListener('click', async () => {
  const full_name = document.getElementById("fullName").value.trim();
  const username = document.getElementById("username").value.trim();
  const email_contact = document.getElementById("emailContact").value.trim();

  if (!full_name || !username || !email_contact) {
    alert("Por favor completa todos los campos.");
    return;
  }

  try {
    const res = await fetch("https://orion-production-5768.up.railway.app/user/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ full_name, username, email_contact })
    });

    const data = await res.json();

    if (res.ok && data.success && data.user && data.user.orion_user_id) {
      // Todo fue exitoso, guardar y mostrar UI
      chrome.storage.local.set({ orionUser: data.user }, () => {
        updateUI(data.user);
        document.getElementById("user-setup-form").style.display = "none";
      });
    } else {
      alert(data.error || "No se pudo guardar la información.");
    }

  } catch (err) {
    console.error("❌ Error al guardar perfil:", err);
    alert("Error de red al guardar la información.");
  }
});


  // Login con Google con loader
  loginGoogle.addEventListener('click', () => {
    const loader = document.createElement('div');
    loader.className = 'loader-overlay';
    loader.innerHTML = '<div class="loader"></div><p>Iniciando sesión con Google...</p>';
    document.body.appendChild(loader);

    const authWin = window.open(
      'https://orion-production-5768.up.railway.app/auth/google',
      'OrionGoogleLogin',
      'width=500,height=600'
    );

window.addEventListener('message', function listener(event) {
  if (event.data.type === 'orion-auth-success') {
    window.removeEventListener('message', listener);
    loader.remove();

    const { user, needsSetup } = event.data;
    if (needsSetup) {
      showUserSetupForm(user);
    } else {
      chrome.storage.local.set({ orionUser: user }, () => updateUI(user));
    }
  }
});

    const fallback = setInterval(() => {
      if (authWin.closed) {
        clearInterval(fallback);
        loader.remove();
        checkSession();
      }
    }, 500);
  });

  // Logout
  logoutBtn.addEventListener('click', async () => {
    await fetch('https://orion-production-5768.up.railway.app/logout', {
      method: 'POST',
      credentials: 'include'
    });
    updateUI(null);
  });
});