FROM phusion/passenger-nodejs:latest
RUN apt-get update
RUN rm /etc/nginx/sites-enabled/default
RUN rm -f /etc/service/nginx/down
RUN rm /etc/nginx/nginx.conf
COPY prenginx.conf /etc/nginx/nginx.conf
RUN mkdir /src
COPY ./bin ./src/bin
COPY ./models ./src/models
COPY ./public ./src/public
COPY ./routes ./src/routes
COPY ./app.js ./src/app.js
COPY package.json ./src/package.json
COPY nginx.conf /etc/nginx/sites-enabled/nginx.conf
RUN cd /src && npm install --production
EXPOSE 80 443
CMD ["nginx"]
