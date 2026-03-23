# Good Day Bend v7 Agent - Cloud Function
# Python 3.11 HTTP/Scheduled Function
import functions_framework
from datetime import datetime
import json
import asyncio

@functions_framework.http
def publisher_v7(request):
    """
    HTTP Cloud Function for v7 agent publisher workflow.
    Accepts GET or POST with optional 'date' parameter.
    """
    try:
        request_json = request.get_json(silent=True)
        request_args = request.args
        
        target_date_str = None
        if request_json and 'date' in request_json:
            target_date_str = request_json['date']
        elif request_args and 'date' in request_args:
            target_date_str = request_args['date']
            
        target_date = None
        if target_date_str:
            target_date = datetime.strptime(target_date_str, "%Y-%m-%d")
            
        print(f"📅 Publisher v7 triggered for {target_date_str or 'today'}")
        
        from agent import publisher
        result = asyncio.run(publisher.publish_daily_article(target_date))
        
        return json.dumps({
            "status": "success",
            "date": target_date_str or datetime.now().strftime("%Y-%m-%d"),
            "result": result
        }, indent=2), 200
        
    except Exception as e:
        print(f"❌ Publisher v7 error: {e}")
        import traceback
        traceback.print_exc()
        return json.dumps({
            "status": "error",
            "error": str(e)
        }), 500

@functions_framework.cloud_event
def publisher_v7_scheduled(cloud_event):
    """
    Scheduled Cloud Function (triggered by Cloud Scheduler).
    Runs the publisher workflow for today's date.
    """
    try:
        print(f"📅 Scheduled Publisher v7 executing")
        from agent import publisher
        result = asyncio.run(publisher.publish_daily_article())
        print(f"✅ Scheduled Publisher v7 completed")
    except Exception as e:
        print(f"❌ Scheduled Publisher v7 error: {e}")
        import traceback
        traceback.print_exc()

@functions_framework.http
def trend_blog_v7(request):
    """
    HTTP Cloud Function for V7 Trend Blog.
    Triggers the deep research trend workflow.
    """
    try:
        from agent import trend_blog
        
        request_json = request.get_json(silent=True)
        topic = request_json.get('topic') if request_json else None
        
        print(f"📈 Trend Blog v7 triggered. Topic override: {topic}")
        
        result = asyncio.run(trend_blog.publish_trend_blog())
        
        return json.dumps({
            "status": "success",
            "result": result
        }, default=str), 200
        
    except Exception as e:
        print(f"❌ Trend Blog v7 error: {e}")
        import traceback
        traceback.print_exc()
        return json.dumps({
            "status": "error",
            "error": str(e)
        }), 500
