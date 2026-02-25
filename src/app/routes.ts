import { createBrowserRouter } from "react-router";
import Home from "./pages/Home";
import GamePage from "./pages/GamePage";
import Profile from "./pages/Profile";

export const router = createBrowserRouter([
  { path: "/", Component: Home },
  { path: "/game/:gameId", Component: GamePage },
  { path: "/profile", Component: Profile },
]);
