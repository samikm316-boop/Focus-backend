import app from "./app.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Focus+ Backend v8 running on port ${PORT}`);
});
