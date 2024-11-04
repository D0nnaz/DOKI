const socket = io();

function updateItemColors(itemList) {
  const colors = ["card-yellow", "card-grey", "card-pink", "card-green"];
  const totalItems = itemList.children.length;

  for (let i = 0; i < totalItems; i++) {
    const item = itemList.children[i];
    const colorClass = colors[i % colors.length];
    item.classList.remove("card-yellow", "card-grey", "card-pink", "card-green");
    item.classList.add(colorClass);

    const doneButton = item.querySelector(".mark-button");
    if (doneButton) {
      doneButton.className = `mark-button ${colorClass}`;
    }

    const closeButton = item.querySelector(".delete-btn");
    if (closeButton) {
      closeButton.className = `delete-btn ${colorClass}`;
    }
  }
}

socket.on("itemAdded", function (newItem) {
  const itemList = document.getElementById("todo-list");
  const newItemElement = document.createElement("li");
  newItemElement.classList.add("todo-card");
  newItemElement.textContent = newItem.text;
  newItemElement.id = newItem._id;

  const doneButton = document.createElement("button");
  doneButton.textContent = "Done";
  doneButton.classList.add("mark-button");
  doneButton.onclick = function () {
    markAsDone(newItem._id);
  };
  newItemElement.appendChild(doneButton);

  const closeButton = document.createElement("button");
  closeButton.textContent = "⤫";
  closeButton.classList.add("delete-btn");
  closeButton.onclick = function () {
    openDeletePopup(newItem._id);
  };
  newItemElement.appendChild(closeButton);

  itemList.appendChild(newItemElement);
  updateItemColors(itemList);
  updateItemCount();
});

document.addEventListener("DOMContentLoaded", function () {
  const todoList = document.getElementById("todo-list");
  const doneList = document.getElementById("done-list");
  updateItemColors(todoList);
  updateItemColors(doneList);
});

socket.on("itemDeleted", function (itemId) {
  const itemElement = document.getElementById(itemId);
  if (itemElement) {
    itemElement.remove();
  }
  updateItemCount();
});

socket.on("itemMarkedAsDone", function (itemId) {
  const itemElement = document.getElementById(itemId);
  if (itemElement) {
    document.getElementById("done-list").appendChild(itemElement);
    itemElement.querySelector(".mark-button").remove();

    const revertButton = document.createElement("button");
    revertButton.textContent = "Revert";
    revertButton.classList.add("mark-button");
    revertButton.onclick = function () {
      markAsNotDone(itemId);
    };
    itemElement.appendChild(revertButton);

    const closeButton = document.createElement("button");
    closeButton.textContent = "⤫";
    closeButton.classList.add("delete-btn");
    closeButton.onclick = function () {
      openDeletePopup(itemId);
    };
    itemElement.appendChild(closeButton);

    updateItemColors(document.getElementById("done-list"));
    updateItemCount();
  }
});

socket.on("itemReverted", function (itemId) {
  const itemElement = document.getElementById(itemId);
  if (itemElement) {
    document.getElementById("todo-list").appendChild(itemElement);
    itemElement.querySelector(".mark-button").remove();

    const doneButton = document.createElement("button");
    doneButton.className = "mark-button";
    doneButton.textContent = "Done";
    doneButton.setAttribute("onclick", `markAsDone('${itemId}')`);
    itemElement.appendChild(doneButton);

    const closeButton = document.createElement("button");
    closeButton.textContent = "⤫";
    closeButton.classList.add("delete-btn");
    closeButton.onclick = function () {
      openDeletePopup(itemId);
    };
    itemElement.appendChild(closeButton);

    updateItemColors(document.getElementById("todo-list"));
    updateItemCount();
  }
});

function openAddPopup() {
  document.getElementById("add-popup").style.display = "flex";
}

function closeAddPopup() {
  document.getElementById("add-popup").style.display = "none";
}

function openDeletePopup(itemId) {
  document.getElementById("delete-popup").style.display = "flex";
  window.itemToDelete = itemId;
}

function closeDeletePopup() {
  document.getElementById("delete-popup").style.display = "none";
}

function addNewTask() {
  const newTaskText = document.getElementById("new-task").value;
  const newTask = { text: newTaskText };

  fetch("/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newTask),
  })
    .then((response) => response.json())
    .then((data) => {
      socket.emit("itemAdded", { _id: data._id, text: newTask.text });
      closeAddPopup();
      document.getElementById("new-task").value = "";
    })
    .catch((error) => console.error("Error adding task:", error));
}

function confirmDelete() {
  fetch("/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ itemId: window.itemToDelete }),
  })
    .then(() => {
      socket.emit("itemDeleted", window.itemToDelete);
      closeDeletePopup();
    })
    .catch((error) => console.error("Error deleting task:", error));
}

function markAsDone(itemId) {
  socket.emit("markItemAsDone", itemId);
}

function updateItemCount() {
  const itemCountElement = document.querySelector(".item-count");
  const currentCount = document.getElementById("todo-list").children.length;
  itemCountElement.textContent = currentCount;
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", function () {
    document.querySelector(".tab.active").classList.remove("active");
    this.classList.add("active");

    const tabContentId = this.getAttribute("data-tab");
    document
      .querySelectorAll(".task-list")
      .forEach((list) => list.classList.add("hidden"));
    document.getElementById(tabContentId + "-list").classList.remove("hidden");

    updateItemText(tabContentId);
  });
});

function updateItemText(tab) {
  const itemCountElement = document.querySelector(".item-count");
  const itemTextElement = document.querySelector(".item-text");
  const itemCount = document.getElementById(`${tab}-list`).children.length;

  itemCountElement.textContent = itemCount;
  if (tab === "todo") {
    itemTextElement.textContent = "things to do.";
  } else if (tab === "done") {
    itemTextElement.textContent = "things done.";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const activeTab = document.querySelector(".tab.active").getAttribute("data-tab");
  updateItemText(activeTab);
});

function markAsNotDone(itemId) {
  fetch("/revert", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ itemId }),
  })
    .then(() => {
      socket.emit("markItemAsNotDone", itemId);
    })
    .catch((error) => console.error("Error reverting task:", error));
}

function updateTime() {
  const options = { hour: '2-digit', minute: '2-digit', hour12: false };
  const now = new Date().toLocaleTimeString('nl-NL', options);

  document.querySelectorAll('.time').forEach(el => {
    el.textContent = now;
  });
}

updateTime();
setInterval(updateTime, 60000);