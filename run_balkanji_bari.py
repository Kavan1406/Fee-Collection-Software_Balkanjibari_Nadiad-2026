import subprocess
import os
import sys
import time
import signal

def run_servers():
    """
    Starts both the Next.js frontend and Django backend servers concurrently.
    """
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, 'backend')

    print("\n" + "="*50)
    print("  BALKANJI BARI - LOCAL SERVER STARTER")
    print("="*50 + "\n")

    # 1. Start Backend (Django)
    print("[1/2] Starting Django Backend...")
    # Using sys.executable to ensure we use the same python environment
    backend_process = subprocess.Popen(
        [sys.executable, "manage.py", "runserver"],
        cwd=backend_dir,
        shell=True if os.name == 'nt' else False
    )

    # Small delay to let backend start initializing
    time.sleep(2)

    # 2. Start Frontend (Next.js)
    print("[2/2] Starting Next.js Frontend...")
    frontend_process = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=root_dir,
        shell=True if os.name == 'nt' else False
    )

    print("\n" + "-"*50)
    print("SERVERS ARE RUNNING!")
    print(f"Backend:  http://127.0.0.1:8000")
    print(f"Frontend: http://localhost:3000")
    print("-"*50)
    print("\nPress Ctrl+C to stop both servers safely.\n")

    try:
        # Keep the script alive while processes are running
        while True:
            time.sleep(1)
            if backend_process.poll() is not None or frontend_process.poll() is not None:
                break
    except KeyboardInterrupt:
        print("\n\nStopping servers...")
    finally:
        # Terminate processes
        frontend_process.terminate()
        backend_process.terminate()
        print("Servers stopped successfully.\n")

if __name__ == "__main__":
    run_servers()
