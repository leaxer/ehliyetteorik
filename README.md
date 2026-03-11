# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

---

## Backend Setup (Ehliyet Uygulaması)

This project includes a Node.js/Express backend with Prisma and PostgreSQL.

### Prerequisites

- PostgreSQL installed and running.

### Setup Steps

1.  **Navigate to Backend**:
    ```bash
    cd backend
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    - Update `backend/.env` file.
    - Set `DATABASE_URL` to your PostgreSQL connection string.
    - Example: `DATABASE_URL="postgresql://username:password@localhost:5432/ehliyet_db?schema=public"`

4.  **Run Database Migrations**:
    ```bash
    npx prisma migrate dev --name init
    ```

5.  **Start the Backend**:
    ```bash
    npm run dev
    ```
    (Or from the project root: `npm run backend`)

### API Endpoints

- `POST /api/auth/register`: Register a new user.
- `POST /api/auth/login`: Login user.

### Frontend Configuration

The frontend is configured to connect to:
- Android Emulator: `http://10.0.2.2:3000/api/auth`
- iOS Simulator / Web: `http://localhost:3000/api/auth`

If you are running on a physical device, update `API_URL` in `app/auth/login.tsx` and `app/auth/register.tsx` with your computer's local IP address.
