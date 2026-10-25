# Continuous attack presentation

Active polling waited 3500 ms after each response, while confirmed replay was bounded to 1500 ms. This repeatedly exhausted queued attacks, presenting short bursts separated by idle gaps. Active cadence is now 350 ms from request start, with at least 50 ms before the next request and exactly one in-flight read. Idle 6000 ms, catch-up 500 ms and error backoff remain unchanged.

The regression drives the actual replay functions for 30 seconds with 1.2-second attacks and 90–260 ms variable response latency. It reproduces gaps above two seconds with the previous policy and verifies gaps at most 1250 ms with the fixed policy, unique confirmed damage, unchanged idle/catch-up/backoff, wake cancellation and cleanup. It does not synthesize attacks or change server combat clocks, attack speed, damage, saves or offline rewards. Sustained network delays beyond the presentation buffer can still cause an underrun.
