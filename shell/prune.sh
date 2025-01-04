docker stop fullstack_container
docker rm fullstack_container
docker rmi -f fullstack_image
docker system prune -a -f