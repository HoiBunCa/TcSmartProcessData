# Stage 1: Build Angular app
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json /app
RUN npm install
COPY . /app
RUN npm run build --prod

# Stage 2: Serve via Nginx
FROM nginx:stable-alpine

# Remove default Nginx static files
RUN rm -rf /usr/share/nginx/html/*

# Copy built Angular app to Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config if needed
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Mount nginx config from local device

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]