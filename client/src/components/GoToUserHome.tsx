import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

type Status = "idle" | "loading" | "notFound";

/**
 * Find user by username,
 * and go to the user's home page
 */
export default function GoToUserHome() {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const navigate = useNavigate();

  const notFound = status === "notFound";
  const loading = status === "loading";

  const reset = useCallback(() => {
    setUsername("");
    setStatus("idle");
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

  const handleSubmit = useCallback(
    (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();

      // The button acts as "Reset" in the error state
      if (notFound) {
        reset();
        return;
      }

      const name = username.trim();
      if (!name || loading) return;

      setStatus("loading");
      fetch(`/api/users/check-username/${encodeURIComponent(name)}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.found === true) {
            setStatus("idle");
            setUsername('')
            navigate(`/home/${encodeURIComponent(name)}`);
          } else {
            setUsername(name);
            setStatus("notFound");
          }
        })
        .catch(() => {
          // Network/server error: let the user try again
          setStatus("idle");
        });
    },
    [username, loading, notFound, navigate, reset]
  );

  return (
    <form onSubmit={handleSubmit} className="inline-flex items-center gap-2">
      <input
        type="text"
        value={notFound ? `Can't find: ${username}` : username}
        onChange={handleChange}
        readOnly={notFound}
        placeholder="Username"
        aria-label="Username"
        aria-invalid={notFound}
        className={[
          "w-44 rounded-md border px-3 py-1.5 text-sm outline-none transition-colors",
          "focus:ring-2",
          notFound
            ? "border-red-500 bg-red-50 text-red-600 focus:ring-red-300"
            : "border-black-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-300",
        ].join(" ")}
      />
      <button
        type="submit"
        disabled={loading}
        className={[
          "rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
          notFound
            ? "bg-red-600 hover:bg-red-700 focus:ring-red-400"
            : "bg-black hover:bg-gray-700 focus:ring-blue-400",
        ].join(" ")}
      >
        {notFound ? "Reset" : "Go"}
      </button>
    </form>
  );
}
