let usernameField = document.getElementById('username');
let passwordField = document.getElementById('password');
let getErrorText = document.getElementById('get_error');
let pathField = document.getElementById('path');
let destinationField = document.getElementById('destination');
let createErrorText = document.getElementById('create_error');
let lnList = document.getElementById('list');

function clearErrorText() {
    getErrorText.innerText = '';
    createErrorText.innerText = '';
    let deleteErrorTextFields = document.getElementsByClassName('delete_error');
    deleteErrorTextFields.value = '';
};

async function getList() {
    let reqObject = {
        username: usernameField.value,
        password: passwordField.value
    };
    const res = await fetch(`/api/get`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(reqObject)
    });
    const resObject = await res.json();
    clearErrorText();
    if (resObject.status === 'error') {
        getErrorText.innerText = resObject.auth_message;
        return;
    };
    let HTML = '';
    resObject.links.forEach(element => {
        HTML+= `<div>
                <p>Path: ${element.path}</p>
                <p>Destination: ${element.destination}</p>
                <p>Use: ${element.use_count}</p>
                <p>Limit: ${element.use_limit}</p>
                <p>Creation: ${element.creation_time}</p>
                <p>Last Used: ${element.last_used}</p>
                <button onclick="deleteLink('${element.id}')" class="delete">Delete</button>
                <p id="${element.id}" class="delete_error"></p>
                <br></div>`;
    });
    lnList.innerHTML = HTML;
};

async function createLink() {
    let reqObject = {
        username: usernameField.value,
        password: passwordField.value,
        path: pathField.value,
        destination: destinationField.value
    };
    const res = await fetch(`/api/create`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(reqObject)
    });
    const resObject = await res.json();
    clearErrorText();
    if (resObject.status === 'error') {
        getErrorText.innerText = resObject.auth_message || '';
        createErrorText.innerText = resObject.ln_message || '';
        return;
    };
    getList();
};

async function deleteLink(id) {
    let reqObject = {
        username: usernameField.value,
        password: passwordField.value,
        id: id
    };
    const res = await fetch(`/api/delete`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(reqObject)
    });
    const resObject = await res.json();
    clearErrorText();
    if (resObject.status === 'error') {
        document.getElementById(id).innerText = resObject.delete_message;
    };
    getList();
};