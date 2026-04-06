import { useEffect, useState, type ReactNode } from "react";
import { DirectionProvider } from "@radix-ui/react-direction";

function readDocumentDir(): "rtl" | "ltr" {
  return document.documentElement.dir === "rtl" ? "rtl" : "ltr";
}

export function RadixDirectionProvider({ children }: { children: ReactNode }) {
  const [dir, setDir] = useState<"rtl" | "ltr">(readDocumentDir);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDir(readDocumentDir());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["dir"],
    });
    return () => observer.disconnect();
  }, []);

  return <DirectionProvider dir={dir}>{children}</DirectionProvider>;
}
