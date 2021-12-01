FROM phusion/passenger-nodejs:latest
RUN apt-get update
RUN rm /etc/nginx/sites-enabled/default
RUN rm -f /etc/service/nginx/down
COPY ./src ./src
COPY nginx.conf /etc/nginx/sites-enabled/nginx.conf
RUN cd /src && npm install --production
EXPOSE 80 443
CMD ["nginx"]
