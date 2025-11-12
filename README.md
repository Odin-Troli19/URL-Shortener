# 🔗 Simple URL Shortener

A simple, self-contained URL shortener application built with Node.js, Express, and SQLite. This project was created as a portfolio piece to demonstrate core backend and frontend development skills.

It's a classic system design problem implemented as a functional web application.



## ✨ Features

* **Shorten URLs:** Takes a long URL and returns a unique, short URL.
* **Redirects:** Accessing the short URL redirects the user to the original long URL.
* **Simple Web UI:** A clean HTML/CSS/JS interface to interact with the API.
* **Persistent Storage:** Uses a file-based **SQLite** database to store mappings.
* **API-First:** Includes a simple REST API for shortening URLs.

## 🛠 Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** SQLite (with `sqlite` and `sqlite3` packages)
* **Frontend:** HTML5, CSS3, Vanilla JavaScript (with `fetch`)

## 🚀 How to Run

This project is designed to run with minimal setup.

**Prerequisites:**
* [Node.js](https://nodejs.org/) (v16 or later)
* npm (comes with Node.js)

**Instructions:**

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/url-shortener.git](https://github.com/your-username/url-shortener.git)
    cd url-shortener
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the server:**
    ```bash
    npm start
    ```

4.  **Open the application:**
    The server will be running at `http://localhost:3000`. Open this URL in your browser to use the app.

## 📂 Project Structure

url-shortener/ │ ├── public/ # All static frontend files │ ├── index.html # The main HTML page │ └── styles.css # CSS styles │ ├── .gitignore # Tells Git what to ignore (e.g., node_modules, .db) ├── package.json # Project dependencies and scripts ├── package-lock.json # Exact dependency versions ├── server.js # The main Express server logic └── shortener.db # The SQLite database file (created on first run)



