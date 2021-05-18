#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/stat.h>
#include <sys/types.h>

int main() {

	seteuid (0);
	setegid (0);

    mkdir ("/data", 0755);
    chown ("/data", getuid(), getgid());

}