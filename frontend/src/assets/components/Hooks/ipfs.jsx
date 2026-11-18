async function uploadtoipfs(file, clientName = "") {
  console.log('[IPFS HOOK] Uploading evidence file for:', clientName || 'Personnel');
  const address = import.meta.env.VITE_IPFS_ADDRESS || "localhost";
  const port = import.meta.env.VITE_IPFS_PORT || 8000;
  const backend = `http://${address}:${port}/upload`;

  try {
    const formData = new FormData();
    formData.append("file", file);
    if (clientName) {
      formData.append("clientName", clientName);
    }

    const response = await fetch(backend, {
      method: "POST",
      body: formData,
      credentials: "include"
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Error uploading file to IPFS:", err);
    return { status: false, message: err.message };
  }
}

export default uploadtoipfs;