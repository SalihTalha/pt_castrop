import { defineConfig } from "vite";

const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];
const owner = process.env.GITHUB_REPOSITORY?.split("/")[0];
const isUserPage = repository === `${owner}.github.io`;

export default defineConfig({
  base: repository ? (isUserPage ? "/" : `/${repository}/`) : "./"
});
