SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# Export variables from .env file
set -o allexport
source "$SCRIPT_DIR"/../.env set
set +o allexport

set -eu
# Checks to see if required env vars are set
if [[ -z "$JIRA_ADMIN_EMAIL" ]] || [[ -z "$JIRA_ADMIN_API_TOKEN" ]] || [[ -z "$ATLASSIAN_URL" ]]
then
  echo "Missing environment variables from .env - Please fill in 'JIRA_ADMIN_EMAIL', 'JIRA_ADMIN_API_TOKEN' and 'ATLASSIAN_URL' to be able to have the app install automatically."
  exit 1
fi

# Uninstalling the app first
curl -s -X DELETE -u "$JIRA_ADMIN_EMAIL:$JIRA_ADMIN_API_TOKEN" -H "Content-Type: application/vnd.atl.plugins.install.uri+json" "${ATLASSIAN_URL}/rest/plugins/1.0/${APP_KEY}-key"
echo "Uninstalling old version of the app"

# Getting the UPM token first, which will be used for app installation
UPM_TOKEN=$(curl -s -u "$JIRA_ADMIN_EMAIL:$JIRA_ADMIN_API_TOKEN" --head "${ATLASSIAN_URL}/rest/plugins/1.0/" | grep -F upm-token | cut -c 12- | tr -d '\r\n')

# Installing the app
curl -s  -o /dev/null -u "$JIRA_ADMIN_EMAIL:$JIRA_ADMIN_API_TOKEN" -H "Content-Type: application/vnd.atl.plugins.install.uri+json" -X POST "${ATLASSIAN_URL}/rest/plugins/1.0/?token=${UPM_TOKEN}" -d "{\"pluginUri\":\"${APP_URL}/atlassian-connect.json\", \"pluginName\": \"Atlassian Connect Example Node App\"}"
echo ""
echo "The app has been successfully installed."
echo "
*********************************************************************************************************************
IF YOU ARE USING A FREE NGROK ACCOUNT, PLEASE DO THIS STEP FIRST!!!
Before going to your app, please open this URL first: ${APP_URL}.
This will open up the ngrok page, don't worry just click on the Visit button.
That's it, you're all ready!
*********************************************************************************************************************
*********************************************************************************************************************
Now view your installed apps at this URL: ${ATLASSIAN_URL}/plugins/servlet/upm
*********************************************************************************************************************
"
