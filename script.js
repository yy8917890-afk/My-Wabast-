let currentUser = null;

function getUsers() {
    return JSON.parse(localStorage.getItem("users")) || [];
}

function saveUsers(users) {
    localStorage.setItem("users", JSON.stringify(users));
}

function getBalance(phone) {
    return Number(localStorage.getItem("walletBalance_" + phone)) || 0;
}

function setBalance(phone, amount) {
    localStorage.setItem("walletBalance_" + phone, String(amount));
}

function getTransactions(phone) {
    return JSON.parse(localStorage.getItem("transactions_" + phone)) || [];
}

function addTransaction(phone, type, amount, status) {
    let list = getTransactions(phone);

    list.unshift({
        type: type,
        amount: amount,
        status: status,
        date: new Date().toLocaleString()
    });

    localStorage.setItem("transactions_" + phone, JSON.stringify(list));
}

function showSignup() {
    document.getElementById("signup").classList.remove("hidden");
    document.getElementById("loginBox").classList.add("hidden");
}

function showLogin() {
    document.getElementById("signup").classList.add("hidden");
    document.getElementById("loginBox").classList.remove("hidden");
}

function signup() {
    let name = document.getElementById("newName").value.trim();
    let phone = document.getElementById("newPhone").value.trim();
    let password = document.getElementById("newPassword").value;

    if (!name || !phone || !password) {
        alert("All fields are required!");
        return;
    }

    let users = getUsers();

    if (users.some(user => user.phone === phone)) {
        alert("This mobile number already exists!");
        return;
    }

    users.push({ name, phone, password });
    saveUsers(users);
    setBalance(phone, 0);

    alert("Account created successfully!");
    showLogin();
}

function login() {
    let phone = document.getElementById("username").value.trim();
    let password = document.getElementById("password").value;

    let user = getUsers().find(
        u => u.phone === phone && u.password === password
    );

    if (!user) {
        alert("Wrong mobile number or password!");
        return;
    }

    currentUser = user;

    document.getElementById("loginBox").classList.add("hidden");
    document.getElementById("signup").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    document.getElementById("adminPanel").classList.add("hidden");

    renderDashboard();
}

function renderDashboard() {
    if (!currentUser) return;

    document.getElementById("profileName").textContent = currentUser.name;
    document.getElementById("profilePhone").textContent = currentUser.phone;
    document.getElementById("balance").textContent = getBalance(currentUser.phone);

    let history = document.getElementById("history");
    history.replaceChildren();

    let transactions = getTransactions(currentUser.phone);

    if (transactions.length === 0) {
        history.textContent = "No transactions yet.";
        return;
    }

    transactions.forEach(t => {
        let item = document.createElement("div");
        item.className = "item";
        item.textContent =
            t.type + " | Rs. " + t.amount + " | " +
            t.status + " | " + t.date;
        history.appendChild(item);
    });
}

function logout() {
    currentUser = null;
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("adminPanel").classList.add("hidden");
    showLogin();
}

function requestDeposit() {
    let amount = Number(document.getElementById("depositAmount").value);
    let transactionId = document.getElementById("transactionId").value.trim();

    if (!Number.isFinite(amount) || amount <= 0 || !transactionId) {
        alert("Enter a valid amount and transaction ID!");
        return;
    }

    let requests = JSON.parse(localStorage.getItem("depositRequests")) || [];

    requests.push({
        id: Date.now(),
        name: currentUser.name,
        phone: currentUser.phone,
        amount: amount,
        transactionId: transactionId,
        status: "Pending"
    });

    localStorage.setItem("depositRequests", JSON.stringify(requests));

    addTransaction(currentUser.phone, "Deposit", amount, "Pending");

    document.getElementById("depositAmount").value = "";
    document.getElementById("transactionId").value = "";

    alert("Deposit request submitted!");
    renderDashboard();
}

function requestWithdraw() {
    let amount = Number(document.getElementById("withdrawAmount").value);
    let paymentNumber = document.getElementById("paymentNumber").value.trim();

    if (!Number.isFinite(amount) || amount <= 0 || !paymentNumber) {
        alert("Enter a valid amount and JazzCash number!");
        return;
    }

    if (amount > getBalance(currentUser.phone)) {
        alert("Insufficient balance!");
        return;
    }

    let requests = JSON.parse(localStorage.getItem("withdrawRequests")) || [];

    requests.push({
        id: Date.now(),
        name: currentUser.name,
        phone: currentUser.phone,
        amount: amount,
        paymentNumber: paymentNumber,
        status: "Pending"
    });

    localStorage.setItem("withdrawRequests", JSON.stringify(requests));

    addTransaction(currentUser.phone, "Withdraw", amount, "Pending");

    document.getElementById("withdrawAmount").value = "";
    document.getElementById("paymentNumber").value = "";

    alert("Withdraw request submitted!");
    renderDashboard();
}

function adminLogin() {
    let password = document.getElementById("adminPassword").value;

    if (password !== "786123") {
        alert("Wrong Admin Password!");
        return;
    }

    document.getElementById("adminPassword").value = "";
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("adminPanel").classList.remove("hidden");

    renderAdmin();
}

function renderAdmin() {
    renderDeposits();
    renderWithdrawals();
    renderUsers();
}

function renderDeposits() {
    let container = document.getElementById("adminRequests");
    container.replaceChildren();

    let requests = JSON.parse(localStorage.getItem("depositRequests")) || [];

    if (requests.length === 0) {
        container.textContent = "No deposit requests.";
        return;
    }

    requests.forEach(request => {
        let item = document.createElement("div");
        item.className = "item";

        let info = document.createElement("p");
        info.textContent =
            request.name + " | " + request.phone +
            " | Rs. " + request.amount +
            " | Transaction ID: " + request.transactionId +
            " | " + request.status;

        item.appendChild(info);

        if (request.status === "Pending") {
            let approve = document.createElement("button");
            approve.className = "small-button";
            approve.textContent = "Approve";
            approve.onclick = () => approveDeposit(request.id);

            let reject = document.createElement("button");
            reject.className = "small-button reject";
            reject.textContent = "Reject";
            reject.onclick = () => rejectDeposit(request.id);

            item.append(approve, reject);
        }

        container.appendChild(item);
    });
}

function approveDeposit(id) {
    let requests = JSON.parse(localStorage.getItem("depositRequests")) || [];
    let request = requests.find(r => r.id === id);

    if (!request || request.status !== "Pending") return;

    if (!confirm("Confirm that you have verified this payment?")) return;

    setBalance(
        request.phone,
        getBalance(request.phone) + request.amount
    );

    request.status = "Approved";
    localStorage.setItem("depositRequests", JSON.stringify(requests));

    addTransaction(request.phone, "Deposit", request.amount, "Approved");

    alert("Deposit approved!");
    renderAdmin();
    if (currentUser && currentUser.phone === request.phone) renderDashboard();
}

function rejectDeposit(id) {
    let requests = JSON.parse(localStorage.getItem("depositRequests")) || [];
    let request = requests.find(r => r.id === id);

    if (!request || request.status !== "Pending") return;

    request.status = "Rejected";
    localStorage.setItem("depositRequests", JSON.stringify(requests));

    addTransaction(request.phone, "Deposit", request.amount, "Rejected");

    renderAdmin();
}

function renderWithdrawals() {
    let container = document.getElementById("adminWithdrawals");
    container.replaceChildren();

    let requests = JSON.parse(localStorage.getItem("withdrawRequests")) || [];

    if (requests.length === 0) {
        container.textContent = "No withdraw requests.";
        return;
    }

    requests.forEach(request => {
        let item = document.createElement("div");
        item.className = "item";

        let info = document.createElement("p");
        info.textContent =
            request.name + " | " + request.phone +
            " | Rs. " + request.amount +
            " | Payment Number: " + request.paymentNumber +
            " | " + request.status;

        item.appendChild(info);

        if (request.status === "Pending") {
            let approve = document.createElement("button");
            approve.textContent = "Approve";
            approve.className = "small-button";
            approve.onclick = () => approveWithdraw(request.id);

            let reject = document.createElement("button");
            reject.textContent = "Reject";
            reject.className = "small-button reject";
            reject.onclick = () => rejectWithdraw(request.id);

            item.append(approve, reject);
        }

        container.appendChild(item);
    });
}

function approveWithdraw(id) {
    let requests = JSON.parse(localStorage.getItem("withdrawRequests")) || [];
    let request = requests.find(r => r.id === id);

    if (!request || request.status !== "Pending") return;

    if (request.amount > getBalance(request.phone)) {
        alert("User has insufficient balance!");
        return;
    }

    if (!confirm("Have you sent the payment to the user?")) return;

    setBalance(
        request.phone,
        getBalance(request.phone) - request.amount
    );

    request.status = "Approved";
    localStorage.setItem("withdrawRequests", JSON.stringify(requests));

    addTransaction(request.phone, "Withdraw", request.amount, "Approved");

    alert("Withdraw approved!");
    renderAdmin();
    if (currentUser && currentUser.phone === request.phone) renderDashboard();
}

function rejectWithdraw(id) {
    let requests = JSON.parse(localStorage.getItem("withdrawRequests")) || [];
    let request = requests.find(r => r.id === id);

    if (!request || request.status !== "Pending") return;

    request.status = "Rejected";
    localStorage.setItem("withdrawRequests", JSON.stringify(requests));

    addTransaction(request.phone, "Withdraw", request.amount, "Rejected");

    renderAdmin();
}

function renderUsers() {
    let container = document.getElementById("allUsers");
    let search = document.getElementById("userSearch").value.trim().toLowerCase();

    container.replaceChildren();

    let users = getUsers().filter(user =>
        user.name.toLowerCase().includes(search) ||
        user.phone.toLowerCase().includes(search)
    );

    if (users.length === 0) {
        container.textContent = "No users found.";
        return;
    }

    users.forEach(user => {
        let item = document.createElement("div");
        item.className = "item";

        let info = document.createElement("p");
        info.textContent =
            "Name: " + user.name +
            " | Mobile: " + user.phone +
            " | Balance: Rs. " + getBalance(user.phone);

        let select = document.createElement("button");
        select.className = "small-button";
        select.textContent = "Select User";
        select.onclick = () => {
            document.getElementById("balancePhone").value = user.phone;
            document.getElementById("balanceAmount").focus();
        };

        item.append(info, select);
        container.appendChild(item);
    });
}

function adjustBalance() {
    let phone = document.getElementById("balancePhone").value.trim();
    let amount = Number(document.getElementById("balanceAmount").value);

    let user = getUsers().find(u => u.phone === phone);

    if (!user) {
        alert("User not found!");
        return;
    }

    if (!Number.isFinite(amount) || amount === 0) {
        alert("Enter a valid amount!");
        return;
    }

    let newBalance = getBalance(phone) + amount;

    if (newBalance < 0) {
        alert("Balance cannot be negative!");
        return;
    }

    if (!confirm("Update balance for " + user.name + "?")) return;

    setBalance(phone, newBalance);

    addTransaction(
        phone,
        "Admin Balance Adjustment",
        amount,
        "Adjusted"
    );

    document.getElementById("balanceAmount").value = "";

    alert("User balance updated!");
    renderAdmin();

    if (currentUser && currentUser.phone === phone) {
        renderDashboard();
    }
}

function backToDashboard() {
    document.getElementById("adminPanel").classList.add("hidden");

    if (currentUser) {
        document.getElementById("dashboard").classList.remove("hidden");
        renderDashboard();
    } else {
        showLogin();
    }
}

function adminLogout() {
    backToDashboard();
}

function toggleTheme() {
    document.body.classList.toggle("dark");

    localStorage.setItem(
        "theme",
        document.body.classList.contains("dark") ? "dark" : "light"
    );
}

if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
}

showLogin();
