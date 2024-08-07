build:
	docker build -t telegrambot .
run:
	docker run -d -p 3000:3000 --name telegrambot --rm telegrambot