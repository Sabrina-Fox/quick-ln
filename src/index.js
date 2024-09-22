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
                    <th class="list">Path</th>
                    <th class="list">Destination</th>
                    <th class="list">Use</th>
                    <th class="list">Limit</th>
                    <th class="list">Creation</th>
                    <th class="list">Last Used</th>
                    <th class="list"></th>
                </tr>`;
    resObject.links.forEach(element => {
        HTML+= `<tr>
                    <td class="list"><a href="${`${resObject.url}/${resObject.prefix}/${element.path}`}" target="_blank">${element.path}</a></td>
                    <td class="list"><a href="${element.destination}" target="_blank">${element.destination}</a></td>
                    <td class="list">${element.use_count}</td>
                    <td class="list">${element.use_limit}</td>
                    <td class="list">${element.creation_time}</td>
                    <td class="list">${element.last_used}</td>
                    <td class="list"><button class="delete" id="${element.id}" onclick="deleteLink('${element.id}')">Delete</button></td>
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
        let deleteButton = document.getElementById(id);
        deleteButton.innerText = resObject.delete_message;
        deleteButton.style.color = 'red';
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