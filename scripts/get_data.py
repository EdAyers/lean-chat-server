
"""
This is an example file for getting the

Probably the easiest thing to do is paste this in to your own python project.

Accessing AWS can be a bit of a faff.
https://boto3.amazonaws.com/v1/documentation/api/latest/guide/quickstart.html
https://boto3.amazonaws.com/v1/documentation/api/latest/guide/dynamodb.html

tldr:
- download the AWS CLI (eg `brew install awscli`)
- run `aws configure`, get an access key from E.W.Ayers, region is us-east-1
- then run this script.
"""

from dataclasses import dataclass
import datetime
from typing import List, Literal, Optional, Any
import os
import json
import boto3
from boto3.dynamodb.conditions import Key, Attr

import dateutil.parser # pip install python-dateutil

dynamodb : Any = boto3.resource('dynamodb')
TABLE_NAME = os.getenv('LEAN_CHAT_TABLE_NAME', 'lean-chat')
table = dynamodb.Table(TABLE_NAME)

@dataclass
class Bubble:
    user: Literal['codex', 'me']
    type: Literal['nl', 'code']
    plaintext: str
    id: Optional[str]
    @classmethod
    def of_item(cls, item : dict):
        return cls(
            user = item['user'],
            type = item['type'],
            plaintext = item['plaintext'],
            id = item.get('id', None) ,
        )

@dataclass
class ChatResponse:
    id: str
    # Text that the user input
    input_text: str
    # The github user id of the querier.
    user_id: str
    # These are the contextual bubbles not including response_plaintext and input_text
    bubbles: List[Bubble]
    response_plaintext: str
    timestamp: datetime.datetime
    @classmethod
    def of_item(cls, item):
        return cls(
            id= item['id'],
            input_text = item['inputText'],
            user_id = item['userId'],
            bubbles = [Bubble.of_item(x) for x in json.loads(item['bubbles']) ],
            response_plaintext = item['response_plaintext'],
            timestamp = dateutil.parser.isoparse(item['timestamp']),
        )

@dataclass
class ChatRating:
    # the id of the rating itself (shouldn't need this)
    id: str
    val: Optional[Literal[1, -1]]
    comment: Optional[str]
    # github id of the user that rated it (use this to spot double counted ratings?)
    user_id: str

    timestamp: datetime.datetime
    # the ChatResponse id that we are rating
    response_id: str
    @classmethod
    def of_item(cls, item):
        val : Any = item.get('val', None)
        if val is not None:
            val = int(val)
        return cls(
            id= item['id'],
            val = val,
            comment = item.get('comment', None),
            user_id = item['userId'],
            timestamp = dateutil.parser.isoparse(item['timestamp']),
            response_id = item['responseId']
        )


@dataclass
class DocgenRating:
    # digest is the md5 hash of the informal_text that produced the rating
    digest: str
    decl: str
    statement: str
    id: str
    val: Literal[1, -1]
    edit: Optional[str]
    timestamp: datetime.datetime
    @classmethod
    def of_item(cls, item):
        val : Any = item.get('val', None)
        if val is not None:
            val = int(val)
        return cls(
            id = item['id'],
            digest = item['digest'],
            statement = item['statement'],
            decl = item['decl'],
            val = val,
            edit = item.get('edit', None),
            timestamp=dateutil.parser.isoparse(item['timestamp']))

def get_chat_ratings():
    response = table.scan(
        FilterExpression = Attr('kind').eq('rating')
    )
    return [ChatRating.of_item(x) for x in response['Items']]

def get_chats():
    response = table.scan(
        FilterExpression = Attr('kind').eq('chat')
    )
    return [ChatResponse.of_item(x) for x in response['Items']]

def get_docgen_ratings():
    response = table.scan(
        FilterExpression = Attr('kind').eq('docgen-rating')
    )
    items = map(DocgenRating.of_item,  response['Items'])
    return items

if __name__ == '__main__':
    for chat in get_chats():
        print(chat)