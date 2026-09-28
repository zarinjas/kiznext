// Metro config for the KIZ mobile app.
//
// The pure, platform-free code in `packages/shared` is consumed directly as
// TypeScript source (no build step, no npm workspace) so web and mobile can
// never drift on tokens, roles, timezone or announcement metadata. Metro only
// watches its project root by default, so we add the shared package as a watch
// folder and map the `@kiz/shared` specifier onto it.
const { getDefaultConfig } = require("expo/metro-config")
const path = require("path")

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, "..")
const sharedRoot = path.resolve(workspaceRoot, "packages/shared")

const config = getDefaultConfig(projectRoot)

config.watchFolders = [sharedRoot]

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
]

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@kiz/shared": sharedRoot,
}

module.exports = config
