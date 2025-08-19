import discord
from discord.ext import commands
import aiohttp

class Reactions(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def fetch_gif(self, endpoint: str):
        """Fetch a random gif from the given API endpoint."""
        async with aiohttp.ClientSession() as session:
            async with session.get(endpoint) as r:
                data = await r.json()
                return data["url"]

    async def make_reaction_embed(self, ctx, action: str, target: discord.Member, gif_url: str):
        """Create a styled embed for a reaction command."""
        embed = discord.Embed(
            title=f"{action.title()} ✨",
            description=f"{ctx.author.mention} {action}s {target.mention} 💕",
            color=discord.Color.random()
        )
        embed.set_image(url=gif_url)
        embed.set_author(
            name=ctx.author.display_name,
            icon_url=ctx.author.avatar.url if ctx.author.avatar else ctx.author.default_avatar.url
        )
        embed.set_footer(
            text="made with 💖",
            icon_url="https://cdn.discordapp.com/emojis/1406415719951761449.gif"  # you can replace with your own icon
        )
        return embed

    @commands.command()
    async def hug(self, ctx, member: discord.Member):
        gif_url = await self.fetch_gif("https://api.waifu.pics/sfw/hug")
        embed = await self.make_reaction_embed(ctx, "hug", member, gif_url)
        await ctx.send(embed=embed)

    @commands.command()
    async def slap(self, ctx, member: discord.Member):
        gif_url = await self.fetch_gif("https://api.waifu.pics/sfw/slap")
        embed = await self.make_reaction_embed(ctx, "slap", member, gif_url)
        await ctx.send(embed=embed)

    @commands.command()
    async def pat(self, ctx, member: discord.Member):
        gif_url = await self.fetch_gif("https://api.waifu.pics/sfw/pat")
        embed = await self.make_reaction_embed(ctx, "pat", member, gif_url)
        await ctx.send(embed=embed)

    @commands.command()
    async def kiss(self, ctx, member: discord.Member):
        gif_url = await self.fetch_gif("https://api.waifu.pics/sfw/kiss")
        embed = await self.make_reaction_embed(ctx, "kiss", member, gif_url)
        await ctx.send(embed=embed)


async def setup(bot):
    await bot.add_cog(Reactions(bot))
