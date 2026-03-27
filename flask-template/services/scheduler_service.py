"""
Background scheduler for periodic tasks.

Add your own scheduled jobs in init_scheduler().
File-based locking prevents duplicate schedulers across gunicorn workers.
"""

import threading
import os
from datetime import datetime, timezone as tz
from apscheduler.schedulers.background import BackgroundScheduler

_scheduler_lock_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.scheduler_lock')

scheduler = None


def _acquire_scheduler_lock():
    """Try to acquire the lock file. Returns file handle if successful, None otherwise."""
    try:
        lock_file = open(_scheduler_lock_file, 'w')
        try:
            pid = lock_file.read().strip()
            if pid:
                try:
                    os.kill(int(pid), 0)
                    lock_file.close()
                    return None
                except (OSError, ProcessLookupError):
                    pass
        except (ValueError, IOError):
            pass
        lock_file.seek(0)
        lock_file.write(str(os.getpid()))
        lock_file.truncate()
        lock_file.flush()
        return lock_file
    except (IOError, OSError):
        return None


def example_periodic_task(app):
    """Example scheduled job — replace or extend with real tasks."""
    with app.app_context():
        now_utc = datetime.now(tz.utc)
        print(f"[Scheduler] Tick at {now_utc.strftime('%Y-%m-%d %H:%M:%S')} UTC")
        # TODO: add your logic here


def init_scheduler(app):
    """Initialize and start the background scheduler. Called once from create_app()."""
    global scheduler

    if scheduler is not None:
        return

    lock = _acquire_scheduler_lock()
    if lock is None:
        print("[Scheduler] Another process is already running the scheduler, skipping")
        return

    scheduler = BackgroundScheduler(daemon=True)

    # Example: run every minute
    scheduler.add_job(
        func=example_periodic_task,
        trigger='cron',
        second=0,
        args=[app],
        id='example_job',
        name='Example periodic task',
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=30,
    )

    scheduler.start()
    print("[Scheduler] Scheduler started")
