#!/bin/sh
# Installs the latest development build of the Ameise node into a running n8n
# Docker container. Needs only curl, tar and docker on the host.
#
#   curl -fsSL https://raw.githubusercontent.com/hayBIT/n8n-nodes-ameise/main/scripts/update-dev.sh | sh -s -- <container>
#
# Options:
#   --restart   always restart the container. Without N8N_DEV_RELOAD=true the
#               container is restarted anyway; with it n8n reloads the node in place.
#   AMEISE_DEV_BUILD_URL   overrides the download URL (e.g. a local file:// tarball)
set -eu

usage() {
	echo "Usage: update-dev.sh <container> [--restart]" >&2
	exit 1
}

container=""
restart=false
for arg in "$@"; do
	case "$arg" in
		--restart) restart=true ;;
		-h | --help) usage ;;
		*) container="$arg" ;;
	esac
done
[ -n "$container" ] || usage

url="${AMEISE_DEV_BUILD_URL:-https://github.com/hayBIT/n8n-nodes-ameise/releases/download/dev/n8n-nodes-ameise-dist.tar.gz}"
target=/home/node/.n8n/custom/n8n-nodes-ameise
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

echo "Downloading $url"
curl -fsSL "$url" -o "$tmp/dist.tar.gz"
mkdir "$tmp/n8n-nodes-ameise"
tar -xzf "$tmp/dist.tar.gz" -C "$tmp/n8n-nodes-ameise"

echo "Installing into $container:$target"
# docker cp writes files as root, so clean up and fix ownership as root
docker exec -u root "$container" sh -c "rm -rf '$target' && mkdir -p '$(dirname "$target")'"
docker cp "$tmp/n8n-nodes-ameise" "$container:$target"
docker exec -u root "$container" chown -R node:node "$(dirname "$target")"

if [ -f "$tmp/n8n-nodes-ameise/BUILD_INFO" ]; then
	sed 's/^/  /' "$tmp/n8n-nodes-ameise/BUILD_INFO"
fi

reload=$(docker exec "$container" printenv N8N_DEV_RELOAD 2>/dev/null || true)
if [ "$restart" != true ] && [ "$reload" = "true" ]; then
	# n8n cannot watch files inside Docker, but reloads custom nodes on request
	echo "Reloading custom nodes (N8N_DEV_RELOAD=true)"
	if docker exec "$container" node -e '
		const port = process.env.N8N_PORT || "5678";
		fetch(`http://127.0.0.1:${port}/rest/dev/reload`, { method: "POST" })
			.then((r) => process.exit(r.ok ? 0 : 1))
			.catch(() => process.exit(1));
	'; then
		echo "Done. Reload the n8n editor in your browser."
		exit 0
	fi
	echo "Reload request failed, restarting instead"
fi

echo "Restarting $container"
docker restart "$container" >/dev/null
echo "Done. Reload the n8n editor in your browser once n8n is up again."
