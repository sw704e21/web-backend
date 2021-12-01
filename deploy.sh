#!/bin/bash

cd "/var/www/cryptoserver/web-backend/" || exit

git pull

cd ..

docker kill webapi

docker rm webapi

docker image build -t webapi -f web-backend/Dockerfile web-backend

docker run -d -p 80:80 -p 443:443 -v logs:/var/log/nginx --name webapi webapi
