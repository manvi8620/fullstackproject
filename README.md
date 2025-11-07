Multi-Tenant SaaS Dashboard Project

This project demonstrates a complete multi-tenant SaaS application with a React frontend, a Node.js/Express backend, and a MongoDB database, all orchestrated with Docker Compose.

Project Structure

.
├── client/
│   ├── Dockerfile
│   ├── package.json
│   ├── public/
│   │   └── index.html  (Loads Tailwind)
│   └── src/
│       ├── App.jsx     (Main React app)
│       └── api.js      (Axios API client)
│
├── server/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js       (Express API & DB logic)
│   └── .env.example    (Env variable guide)
│
├── docker-compose.yml  (Main orchestrator)
└── README.md           (This file)


How to Run

Step 1: Create Project Folders

Create a main project folder (e.g., saas-project) and then create the client and server folders inside it.

Place all the files I provided into their correct locations as shown in the structure above.

Step 2: Create the Server .env File

In the server/ directory, create a new file named .env. Copy the contents from .env.example into it.

Your server/.env file should look like this:

JWT_SECRET=your-super-secret-key-change-this
MONGO_URI=mongodb://mongo:27017/saas-dashboard


Important: For a real project, change JWT_SECRET to a long, random string.

Step 3: Run Docker Compose

Open your terminal in the main project folder (the one containing docker-compose.yml) and run:

docker-compose up --build


This will:

Build the Docker images for client and server.

Pull the mongo image.

Start all three containers and link them together.

You will see logs from all three services in your terminal.

Step 4: Seed the Database (One-Time Setup)

The services are running, but the database is empty. You need to run the "seed" script to create the tenants, users, and projects.

Open a new terminal window (while Docker is still running) and run this command:

curl -X POST http://localhost:5000/api/seed


You should see a response like: {"message":"Database seeded successfully!"}.

Your application is now ready!

Step 5: Access Your Application

Open the Tenant Selector:
Go to http://localhost:3000 in your browser.

Access Acme Corp:
Click the "Acme Corp" link or go to http://localhost:3000/#/t/acme.

Email: sanskarsinhanew@gmail.com

Password: password123

Access Globex Industries:
Click the "Globex Industries" link or go to http://localhost:3000/#/t/globex.

Email: globex-user@globex.com

Password: password123

You can now test the full application, including:

Data Isolation: Acme users can't see Globex projects.

Runtime Theming: Each tenant has its own logo and colors.

Admin Panel: Log in as an admin (both users above are admins) and go to the "Admin" tab to change the theme colors in real-time.