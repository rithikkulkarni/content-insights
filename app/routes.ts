import { createBrowserRouter } from "react-router";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AnalyzePage from "./pages/AnalyzePage";
import PhrasesPage from "./pages/PhrasesPage";
import ResultsPage from "./pages/ResultsPage";

const routeDefinitions = [
  {
    path: "",
    Component: LandingPage,
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/signup",
    Component: SignupPage,
  },
  {
    path: "/analyze",
    Component: AnalyzePage,
  },
  {
    path: "/phrases",
    Component: PhrasesPage,
  },
  {
    path: "/results",
    Component: ResultsPage,
  },
];

const createRoutesWithBase = (basePath: string) =>
  routeDefinitions.map(({ path, Component }) => ({
    path: path === "" ? basePath || "/" : `${basePath}${path}`,
    Component,
  }));

export const router = createBrowserRouter([
  ...createRoutesWithBase(""),
  ...createRoutesWithBase("/content-insights"),
]);
