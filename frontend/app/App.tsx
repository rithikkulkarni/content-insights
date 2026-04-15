"use client";

import { useEffect, useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { browserRoutes } from "./routes";

export default function App() {
  const [router, setRouter] = useState<ReturnType<typeof createBrowserRouter> | null>(null);

  useEffect(() => {
    setRouter(createBrowserRouter(browserRoutes));
  }, []);

  if (!router) {
    return null;
  }

  return <RouterProvider router={router} />;
}
