let usernameField = document.getElementById('username');
let passwordField = document.getElementById('password');
let getErrorText = document.getElementById('get_error');
let pathField = document.getElementById('path');
let destinationField = document.getElementById('destination');
let createErrorText = document.getElementById('create_error');
let useLimitField = document.getElementById('use_limit');
let useLimitCheckbox = document.getElementById('enable_use_limit')
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
    let HTML = `<tr>
                    <th>Path</th>
                    <th>Destination</th>
                    <th>Use</th>
                    <th>Limit</th>
                    <th>Creation</th>
                    <th>Last Used</th>
                    <th></th>
                </tr>`;
    resObject.links.forEach(element => {
        HTML+= `<tr>
                    <td><a href="${`${resObject.url}/${resObject.prefix}/${element.path}`}" target="_blank">${element.path}</a></td>
                    <td>https://tenor.com/view/sniff-gif-26460635 </td>
                    <td><a href="${element.destination}" target="_blank">${element.destination}</a></td>
                    <td>${element.use_count}</td>
                    <td>${element.creation_time}</td>
                    <td>${element.last_used}</td>
                    <td><button onclick="deleteLink('${element.id}')" class="delete">Delete</button></td>
                    <td><p id="${element.id}" class="delete_error"></p></td>
                </tr>`;
    });
    lnList.innerHTML = HTML;
};

async function createLink() {
    let reqObject = {
        username: usernameField.value,
        password: passwordField.value,
        path: pathField.value,
        destination: destinationField.value,
        enableUseLimit: useLimitCheckbox.checked,
        useLimit: useLimitField.value
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

function updateUseLimitCheckboxAvailability() {
    if (useLimitCheckbox.checked) {
        return useLimitField.disabled = false;
    };
    return useLimitField.disabled = true;
};

useLimitCheckbox.addEventListener('input', () => {
    updateUseLimitCheckboxAvailability();
});