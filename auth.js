document.addEventListener("DOMContentLoaded", init);

const signinURL = "https://01.kood.tech/api/auth/signin";

function init() {
    const loginBtn = document.getElementById("loginbtn");
  
    if (loginBtn) {
        loginBtn.addEventListener("click", handleLogin);
    } else {
        console.error("Login button not found.");
    }
}

function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const credentials = btoa(`${username}:${password}`);

    fetch(signinURL, {
        method: "POST",
        headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/json"
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            displayErrorMessage(data.error);
        } else {
            localStorage.setItem("jwtToken", data);  // Save token
            window.location.href = './profile.html';  // Redirect to profile page
        }
    })
    .catch(error => console.error("Login failed: ", error));
}

function displayErrorMessage(message) {
    const errorMessageDiv = document.getElementById("error-message");
    errorMessageDiv.innerHTML = `<p>${message}</p>`;
}
