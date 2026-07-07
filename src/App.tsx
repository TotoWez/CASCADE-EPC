import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { Toaster } from "./components/Toaster";
import { ConfirmHost } from "./components/ui/ConfirmDialog";
import { useAuth } from "./store/auth";

export default function App() {
  const init = useAuth((s) => s.init);
  useEffect(() => {
    void init();
  }, [init]);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
      <ConfirmHost />
    </>
  );
}
