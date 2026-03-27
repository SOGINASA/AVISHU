from flask import request


def get_client_ip(req):
    if req.headers.get('X-Forwarded-For'):
        return req.headers.get('X-Forwarded-For').split(',')[0].strip()
    return req.remote_addr or '0.0.0.0'


def parse_user_agent(user_agent_string):
    try:
        from user_agents import parse
        ua = parse(user_agent_string)
        return {
            'device_type': str(ua.device.family),
            'browser': str(ua.browser.family),
            'os': str(ua.os.family),
        }
    except Exception:
        return {'device_type': 'Unknown', 'browser': 'Unknown', 'os': 'Unknown'}


def get_request_context(req):
    device_info = parse_user_agent(req.headers.get('User-Agent', 'Unknown'))
    return {
        'ip_address': get_client_ip(req),
        'user_agent': req.headers.get('User-Agent', 'Unknown'),
        'device_type': device_info['device_type'],
        'browser': device_info['browser'],
        'os': device_info['os'],
    }
