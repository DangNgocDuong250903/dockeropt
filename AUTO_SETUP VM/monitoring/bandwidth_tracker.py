#!/usr/bin/env python3
"""
Bandwidth Tracker
Ghi lại bandwidth usage theo thời gian
"""

import sqlite3
import psutil
import time
from datetime import datetime, timedelta

DB_FILE = '/opt/xray-monitor/bandwidth.db'

class BandwidthTracker:
    def __init__(self):
        self.init_db()
    
    def init_db(self):
        """Khởi tạo database"""
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS bandwidth_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                bytes_sent INTEGER,
                bytes_recv INTEGER,
                packets_sent INTEGER,
                packets_recv INTEGER
            )
        ''')
        conn.commit()
        conn.close()
    
    def record_current(self):
        """Ghi lại bandwidth hiện tại"""
        net_io = psutil.net_io_counters()
        
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute('''
            INSERT INTO bandwidth_history 
            (bytes_sent, bytes_recv, packets_sent, packets_recv)
            VALUES (?, ?, ?, ?)
        ''', (net_io.bytes_sent, net_io.bytes_recv, 
              net_io.packets_sent, net_io.packets_recv))
        conn.commit()
        conn.close()
    
    def get_history(self, hours=24):
        """Lấy lịch sử bandwidth"""
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        cutoff_time = datetime.now() - timedelta(hours=hours)
        c.execute('''
            SELECT * FROM bandwidth_history 
            WHERE timestamp >= ?
            ORDER BY timestamp ASC
        ''', (cutoff_time,))
        
        rows = c.fetchall()
        conn.close()
        
        # Convert to list of dicts
        history = []
        prev_sent = None
        prev_recv = None
        
        for row in rows:
            data = dict(row)
            
            # Calculate delta (bandwidth used since last record)
            if prev_sent is not None:
                data['delta_sent'] = data['bytes_sent'] - prev_sent
                data['delta_recv'] = data['bytes_recv'] - prev_recv
            else:
                data['delta_sent'] = 0
                data['delta_recv'] = 0
            
            prev_sent = data['bytes_sent']
            prev_recv = data['bytes_recv']
            
            history.append(data)
        
        return history
    
    def cleanup_old_data(self, days=30):
        """Xóa data cũ hơn X ngày"""
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        cutoff_time = datetime.now() - timedelta(days=days)
        c.execute('DELETE FROM bandwidth_history WHERE timestamp < ?', (cutoff_time,))
        
        deleted = c.rowcount
        conn.commit()
        conn.close()
        
        return deleted

def run_tracker():
    """Run tracker continuously"""
    tracker = BandwidthTracker()
    print("Bandwidth tracker started...")
    
    while True:
        try:
            tracker.record_current()
            print(f"[{datetime.now()}] Bandwidth recorded")
            
            # Cleanup old data every 24 hours
            if datetime.now().hour == 0 and datetime.now().minute == 0:
                deleted = tracker.cleanup_old_data()
                print(f"Cleaned up {deleted} old records")
            
            # Record every 5 minutes
            time.sleep(300)
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(60)

if __name__ == '__main__':
    run_tracker()

