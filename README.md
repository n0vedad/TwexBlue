# TwexBlue

![TwexBlue Logo](/public/TwexBlue.svg)

This is a proof-of-concept (PoC) to export your blocklist from a data archive from X (formerly known as Twitter) and migrate it to [Bluesky](https://bsky.app). Trough this is just a overview I will not give much detailed instructions here. Maybe it could be a inspiration for other devs or it will remain until I find time to refactor.

## Getting started

### Prerequisites

- Node.js (v14.x or later)
- npm (v6.x or later)
- vite (v5.0.x or later)
- A [Redis](https://redis.io/) server for token management
- Access to the X (formerly known as Twitter) API

### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/n0vedad/TwexBlue.git
   cd twexblue
   ```

2. Install the dependencies:

   ```sh
   npm install
   ```

### Running the application

#### Development mode

To run the application in development mode with hot-reloading:

```sh
npm run dev
```

Open your browser and navigate to [http://localhost:3000](http://localhost:3000) to see the landing page.

#### Production mode

To build and run the application in production mode:

1. Build the application:

   ```sh
   npm run build
   ```

2. Run the production-ready preview:

   ```sh
   npm run preview
   ```

 You can serve this app with Node.js or e.g. the [Vercel Platform](https://vercel.app).

## Project structure

### `public`

Contains the logo for this app.

### `src/assets`

Contains again the logo for this app. This is for now needed for path safety.

### `src/modules`

CSS Modules for the app.

### `src`

JSX Modules and index.css for global styling.

### `index.html`

The HTML app frame.

### `serverBsky.js`

NodeJS-Backend-Server that Handles everyting for [Bluesky](https://bsky.app).

### `serverTw.js`

NodeJS-Backend-Server that Handles everyting for X (formerly known as Twitter).

## License

This project is licensed under the MIT License. See the [LICENSE](/LICENSE) for details.
