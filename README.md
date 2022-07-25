# lean-chat-server
Server for lean-chat


## Set up the server

Go to `dash.deno.com`, make an account etc.
Click 'new project' and get the new project to point at `main.ts` in this repo.
That should be it.

## Set up the database.

I chose to use dynamo because it seemed sufficiently cheap if the amount of data is low and I have used it before.
There are probably better choices, eg just having a server running somewhere with a sqlite file.
Following the setup given in [this tutorial](https://deno.com/deploy/docs/tutorial-dynamodb).

> Our first step in the process is to generate AWS credentials to programmatically access DynamoDB.
> Generate Credentials:

> Go to https://console.aws.amazon.com/iam/ and go to "Users" section.
> Click on Add user button, fill the User name field (maybe use "lean-chat") and select Programmatic access type.
> Click on Next: Permissions, then on Attach existing policies directly, search for AmazonDynamoDBFullAccess and select it.
> Click on Next: Tags, then on Next: Review and finally Create user.
> Click on Download .csv button to download the credentials.
> Create database table:
>
> Go to https://console.aws.amazon.com/dynamodb and click on Create table button.
> Fill the Table name field with `lean-chat` and Primary key with `id`.
> Scroll down and click on Create. That's it.