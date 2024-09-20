let usernameField = document.getElementById('username');
let passwordField = document.getElementById('password');
let pathField = document.getElementById('path');
let destinationField = document.getElementById('destination');

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
    getList();
};