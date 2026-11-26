#include <unistd.h>

int tick(int n) {
    int doubled = n * 2;
    return doubled;
}

int main() {
    int total = 0;
    for (int i = 0; i < 600; i++) {
        total += tick(i);
        usleep(100000);
    }
    return total > 0 ? 0 : 1;
}
