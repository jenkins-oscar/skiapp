FROM node:16-slim
ENV PORT 8080
EXPOSE 8080
WORKDIR /usr/src/app
COPY . .
RUN npm i
CMD ["npm", "start"]
