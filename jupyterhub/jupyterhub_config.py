import os

# JupyterHub configuration for Reportthy scientific platform
c = get_config()  # noqa: F821

# Network & Bindings
c.JupyterHub.ip = '0.0.0.0'
c.JupyterHub.port = 8000

# Authenticator: DummyAuthenticator for zero-friction local research workflow
c.JupyterHub.authenticator_class = 'dummy'
c.DummyAuthenticator.password = ''
c.Authenticator.admin_users = {'researcher'}
c.Authenticator.allowed_users = {'researcher'}
c.JupyterHub.admin_access = True

# Pre-configured Admin API Token for Next.js Bridge
api_token = os.environ.get('JUPYTERHUB_API_TOKEN', 'reportthy-dev-token')
c.JupyterHub.services = [
    {
        'name': 'reportthy-bridge',
        'api_token': api_token,
        'admin': True,
    }
]

# Spawner: Local Process Spawner
c.JupyterHub.spawner_class = 'simple'
c.Spawner.cmd = ['jupyter-labhub']
c.Spawner.default_url = '/lab'
c.Spawner.notebook_dir = '/home/{username}/work'
c.Spawner.env_keep.extend(['PATH', 'REPORTTHY_INTERNAL_URL'])

# Enable seamless iframe embedding in Reportthy Next.js UI
c.JupyterHub.tornado_settings = {
    'headers': {
        'Content-Security-Policy': "frame-ancestors *",
        'Access-Control-Allow-Origin': '*',
    }
}

c.Spawner.args = [
    '--ServerApp.allow_origin=*',
    '--ServerApp.disable_check_xsrf=True',
    '--ServerApp.tornado_settings={"headers":{"Content-Security-Policy":"frame-ancestors *"}}',
]
