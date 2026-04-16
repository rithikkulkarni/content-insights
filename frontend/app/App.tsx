"use client";

import { useMemo } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { browserRoutes } from "./routes";

export default function App() {
  const router = useMemo(() => createBrowserRouter(browserRoutes), []);
  return <RouterProvider router={router} />;
}
