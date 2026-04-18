FROM --platform=$BUILDPLATFORM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline --no-audit

COPY angular.json ./
COPY tsconfig*.json ./
COPY public ./public
COPY src ./src

RUN sed -i "s|apiUrl: 'http://localhost:3000/api'|apiUrl: '/api'|g" src/environments/environment.ts

RUN npm run build -- --configuration production
RUN set -eu; \
		index_file="$(find /app/dist -type f -name index.html | head -n 1 || true)"; \
		if [ -z "$index_file" ]; then \
			echo "Angular build output not found under /app/dist" >&2; \
			find /app/dist -maxdepth 4 -print || true; \
			exit 1; \
		fi; \
		src="$(dirname "$index_file")"; \
	mkdir -p /app/dist/nginx; \
	cp -a "$src"/. /app/dist/nginx/

FROM nginx:1.25-alpine3.19

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist/nginx /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]