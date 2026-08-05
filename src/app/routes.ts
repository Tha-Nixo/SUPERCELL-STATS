import { createBrowserRouter } from "react-router";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

export const router = createBrowserRouter([
  { path: "/", Component: Home },
  {
    path: "/game/:gameId",
    lazy: async () => ({ Component: (await import("./pages/GamePage")).default }),
  },
  {
    // A searched player gets a real address: shareable, bookmarkable, and
    // survives a refresh or the back button.
    path: "/game/:gameId/player/:tag",
    lazy: async () => ({ Component: (await import("./pages/GamePage")).default }),
  },
  { path: "*", Component: NotFound },
]);
